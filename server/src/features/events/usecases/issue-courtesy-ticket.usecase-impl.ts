import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import { EventContract } from "../domain/event.contract";
import {
  CourtesyTicketIssuedDomainEvent,
  EventCancelledDomainEvent,
  EventNotFoundDomainEvent,
  EventSoldOutDomainEvent,
} from "../domain/event.events";
import { issueCourtesyTicket, ticketWhatsAppLink, toPublicEvent } from "../domain/event.entity";
import {
  IssueCourtesyTicketParam,
  IssueCourtesyTicketUsecase,
} from "./issue-courtesy-ticket.usecase";
import { LiveFeedContract, announce } from "../domain/live-feed.contract";

export class IssueCourtesyTicketUsecaseImpl extends IssueCourtesyTicketUsecase {
  constructor(
    private eventContract: EventContract,
    private liveFeed: LiveFeedContract,
  ) {
    super();
  }

  async call(param: IssueCourtesyTicketParam): Promise<DomainEvent> {
    const event = await this.eventContract.getById(param?.eventId);
    if (!event) {
      return EventNotFoundDomainEvent({ id: param?.eventId });
    }

    const result = issueCourtesyTicket(event, param?.attendeeName, param?.phone);
    if (!result.ok) {
      return result.reason === "sold-out"
        ? EventSoldOutDomainEvent(toPublicEvent(event))
        : EventCancelledDomainEvent(toPublicEvent(event));
    }

    const saved = await this.eventContract.save(result.event);
    const ticket = saved.tickets.find((item) => item.id === result.ticket.id)!;
    const boletaUrl = process.env.WEB_URL
      ? `${process.env.WEB_URL}/${saved.slug}/boleta/${ticket.id}`
      : undefined;
    const whatsappLink = ticketWhatsAppLink(saved, ticket, boletaUrl);

    return announce(
      this.liveFeed,
      CourtesyTicketIssuedDomainEvent({ event: toPublicEvent(saved), ticket, whatsappLink }),
    );
  }
}
