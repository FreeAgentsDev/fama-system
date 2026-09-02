import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import { EventContract } from "../domain/event.contract";
import {
  EventNotFoundDomainEvent,
  TicketCannotBeVoidedDomainEvent,
  TicketNotFoundDomainEvent,
  TicketVoidedDomainEvent,
} from "../domain/event.events";
import { toPublicEvent, voidTicket } from "../domain/event.entity";
import { VoidTicketParam, VoidTicketUsecase } from "./void-ticket.usecase";
import { LiveFeedContract, announce } from "../domain/live-feed.contract";

export class VoidTicketUsecaseImpl extends VoidTicketUsecase {
  constructor(
    private eventContract: EventContract,
    private liveFeed: LiveFeedContract,
  ) {
    super();
  }

  async call(param: VoidTicketParam): Promise<DomainEvent> {
    const event = await this.eventContract.getById(param?.eventId);
    if (!event) {
      return EventNotFoundDomainEvent({ id: param?.eventId });
    }

    const result = voidTicket(event, param?.ticketId);
    if (!result.ok) {
      if (result.reason === "already-checked-in") {
        return TicketCannotBeVoidedDomainEvent({ ticketId: param.ticketId });
      }
      return TicketNotFoundDomainEvent({ ticketId: param?.ticketId });
    }

    const saved = await this.eventContract.save(result.event);
    const ticket = saved.tickets.find((item) => item.id === result.ticket.id)!;
    return announce(
      this.liveFeed,
      TicketVoidedDomainEvent({
        event: toPublicEvent(saved),
        ticket,
      }),
    );
  }
}
