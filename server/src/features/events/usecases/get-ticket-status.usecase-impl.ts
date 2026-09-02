import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import { EventContract } from "../domain/event.contract";
import { GottenTicketStatusDomainEvent, TicketNotFoundDomainEvent } from "../domain/event.events";
import { toPublicEvent } from "../domain/event.entity";
import { GetTicketStatusParam, GetTicketStatusUsecase } from "./get-ticket-status.usecase";

export class GetTicketStatusUsecaseImpl extends GetTicketStatusUsecase {
  constructor(private eventContract: EventContract) {
    super();
  }

  async call(param: GetTicketStatusParam): Promise<DomainEvent> {
    const found = await this.eventContract.findByTicketId(param?.ticketId);
    if (!found) {
      return TicketNotFoundDomainEvent({ ticketId: param?.ticketId });
    }
    return GottenTicketStatusDomainEvent({
      event: toPublicEvent(found.event),
      ticket: {
        code: found.ticket.code,
        attendeeName: found.ticket.attendeeName,
        stage: found.ticket.stage,
        paymentStatus: found.ticket.paymentStatus,
      },
    });
  }
}
