import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import { EventContract } from "../domain/event.contract";
import {
  EventCancelledDomainEvent,
  EventNotFoundDomainEvent,
  EventSoldOutDomainEvent,
  TicketReservedDomainEvent,
} from "../domain/event.events";
import { issueTicket, toPublicEvent } from "../domain/event.entity";
import {
  ReserveTicketParam,
  ReserveTicketUsecase,
} from "./reserve-ticket.usecase";
import { LiveFeedContract, announce } from "../domain/live-feed.contract";

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
    const event = await this.eventContract.getById(param?.eventId);
    if (!event) {
      return EventNotFoundDomainEvent({ id: param?.eventId });
    }

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

    return announce(
      this.liveFeed,
      TicketReservedDomainEvent({
        event: toPublicEvent(saved),
        ticket,
      }),
    );
  }
}
