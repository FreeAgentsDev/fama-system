import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import { EventContract } from "../domain/event.contract";
import {
  EventCancelledDomainEvent,
  EventNotFoundDomainEvent,
  EventSoldOutDomainEvent,
  TicketReservedDomainEvent,
} from "../domain/event.events";
import { issueTicket, toPublicEvent, wompiIntegritySignature } from "../domain/event.entity";
import {
  ReserveTicketParam,
  ReserveTicketUsecase,
} from "./reserve-ticket.usecase";
import { LiveFeedContract, announce } from "../domain/live-feed.contract";
import { releaseStaleHolds } from "./release-stale-holds";

/**
 * Reserva una boleta en la etapa vigente. El ticket queda `paymentStatus: 'pending'`
 * hasta que Wompi confirme el pago (ver ConfirmPaymentUsecase, Fase 3).
 */
export class ReserveTicketUsecaseImpl extends ReserveTicketUsecase {
  constructor(
    private eventContract: EventContract,
    private liveFeed: LiveFeedContract,
  ) {
    super();
  }

  async call(param: ReserveTicketParam): Promise<DomainEvent> {
    const stored = await this.eventContract.getById(param?.eventId);
    if (!stored) {
      return EventNotFoundDomainEvent({ id: param?.eventId });
    }

    // Antes de decidir si hay cupo: devolver el de las reservas que nunca se pagaron. Sin
    // esto una etapa se muestra agotada por carritos abandonados que nadie liberó nunca.
    const event = await releaseStaleHolds(this.eventContract, stored);

    const result = issueTicket(event, param?.attendeeName, param?.phone);
    if (!result.ok) {
      if (result.reason === "cancelled") {
        return announce(
          this.liveFeed,
          EventCancelledDomainEvent(toPublicEvent(event)),
        );
      }
      return announce(
        this.liveFeed,
        EventSoldOutDomainEvent(toPublicEvent(event)),
      );
    }

    const saved = await this.eventContract.save(result.event);
    const ticket = saved.tickets.find((item) => item.id === result.ticket.id)!;

    // Sin `WOMPI_INTEGRITY_SECRET` (ej. local sin llaves todavía) se omite: el botón de pago
    // simplemente no manda la firma, en vez de tumbar la reserva por una env var que falta.
    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
    const wompiSignature = integritySecret
      ? wompiIntegritySignature(ticket.paymentRef ?? ticket.id, Math.round(ticket.publicPrice * 100), "COP", integritySecret)
      : undefined;

    return announce(
      this.liveFeed,
      TicketReservedDomainEvent({
        event: toPublicEvent(saved),
        ticket,
        wompiSignature,
      }),
    );
  }
}
