import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import { EventContract } from "../domain/event.contract";
import {
  PaymentAlreadyProcessedDomainEvent,
  PaymentConfirmationUnauthorizedDomainEvent,
  TicketNotFoundDomainEvent,
  TicketPaymentConfirmedDomainEvent,
  TicketPaymentRejectedDomainEvent,
} from "../domain/event.events";
import { confirmPayment, rejectPayment, ticketWhatsAppLink, toPublicEvent } from "../domain/event.entity";
import { ConfirmPaymentParam, ConfirmPaymentUsecase } from "./confirm-payment.usecase";
import { LiveFeedContract, announce } from "../domain/live-feed.contract";

/**
 * Se llama desde `web/app/api/wompi/webhook/route.ts` una vez que Next.js verificó la firma
 * de Wompi. `paymentReference` es el `ticket.id` que se usó como `reference` del checkout.
 */
export class ConfirmPaymentUsecaseImpl extends ConfirmPaymentUsecase {
  constructor(
    private eventContract: EventContract,
    private liveFeed: LiveFeedContract,
  ) {
    super();
  }

  async call(param: ConfirmPaymentParam): Promise<DomainEvent> {
    if (!param?.internalSecret || param.internalSecret !== process.env.INTERNAL_WEBHOOK_SECRET) {
      return PaymentConfirmationUnauthorizedDomainEvent({ reason: "internalSecret inválido" });
    }

    const found = await this.eventContract.findByTicketId(param?.paymentReference);
    if (!found) {
      return TicketNotFoundDomainEvent({ ticketId: param?.paymentReference });
    }

    if (param.status === "declined") {
      const result = rejectPayment(found.event, param.paymentReference);
      if (!result.ok) {
        return result.reason === "already-processed"
          ? PaymentAlreadyProcessedDomainEvent({ ticketId: param.paymentReference })
          : TicketNotFoundDomainEvent({ ticketId: param.paymentReference });
      }
      const saved = await this.eventContract.save(result.event);
      const ticket = saved.tickets.find((item) => item.id === result.ticket.id)!;
      return announce(
        this.liveFeed,
        TicketPaymentRejectedDomainEvent({ event: toPublicEvent(saved), ticket }),
      );
    }

    const result = confirmPayment(found.event, param.paymentReference, param.wompiTransactionId);
    if (!result.ok) {
      return result.reason === "already-processed"
        ? PaymentAlreadyProcessedDomainEvent({ ticketId: param.paymentReference })
        : TicketNotFoundDomainEvent({ ticketId: param.paymentReference });
    }

    const boletaUrl = process.env.WEB_URL
      ? `${process.env.WEB_URL}/${result.event.slug}/boleta/${result.ticket.id}`
      : undefined;
    const whatsappLink = ticketWhatsAppLink(result.event, result.ticket, boletaUrl);
    const withWhatsapp = {
      ...result.event,
      tickets: result.event.tickets.map((item) =>
        item.id === result.ticket.id ? { ...item, whatsappSent: true } : item,
      ),
    };
    const saved = await this.eventContract.save(withWhatsapp);
    const ticket = saved.tickets.find((item) => item.id === result.ticket.id)!;

    return announce(
      this.liveFeed,
      TicketPaymentConfirmedDomainEvent({ event: toPublicEvent(saved), ticket, whatsappLink }),
    );
  }
}
