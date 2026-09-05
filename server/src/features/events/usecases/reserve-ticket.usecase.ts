import { Usecase } from "@scifamek-open-source/iraca/config";
import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import { PublicEvent, Ticket } from "../domain/event.entity";

export interface ReserveTicketParam {
  eventId: string;
  attendeeName: string;
  phone: string;
}

export abstract class ReserveTicketUsecase extends Usecase<
  ReserveTicketParam,
  { event: PublicEvent; ticket: Ticket; wompiSignature?: string }
> {
  abstract call(param: ReserveTicketParam): Promise<DomainEvent>;
}
