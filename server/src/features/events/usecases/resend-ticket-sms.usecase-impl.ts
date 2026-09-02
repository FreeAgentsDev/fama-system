import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import { EventContract } from "../domain/event.contract";
import {
  EventNotFoundDomainEvent,
  SmsSentDomainEvent,
  TicketNotFoundDomainEvent,
} from "../domain/event.events";
import { refreshTicketSms, ticketSmsBody } from "../domain/event.entity";
import { SmsContract } from "../domain/sms.contract";
import {
  ResendTicketSmsParam,
  ResendTicketSmsUsecase,
} from "./resend-ticket-sms.usecase";
import { LiveFeedContract, announce } from "../domain/live-feed.contract";

export class ResendTicketSmsUsecaseImpl extends ResendTicketSmsUsecase {
  constructor(
    private eventContract: EventContract,
    private smsContract: SmsContract,
    private liveFeed: LiveFeedContract,
  ) {
    super();
  }

  async call(param: ResendTicketSmsParam): Promise<DomainEvent> {
    const event = await this.eventContract.getById(param?.eventId);
    if (!event) {
      return EventNotFoundDomainEvent({ id: param?.eventId });
    }

    const next = refreshTicketSms(event, param?.ticketId);
    if (!next) {
      return TicketNotFoundDomainEvent({ ticketId: param?.ticketId });
    }

    const saved = await this.eventContract.save(next);
    const ticket = saved.tickets.find((item) => item.id === param.ticketId)!;
    const sms = await this.smsContract.send({
      eventId: saved.id,
      ticketId: ticket.id,
      phone: ticket.phone,
      body: ticketSmsBody(saved, ticket),
    });

    return announce(this.liveFeed, SmsSentDomainEvent({ ticket, sms }));
  }
}
