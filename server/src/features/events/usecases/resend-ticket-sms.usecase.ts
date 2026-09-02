import { Usecase } from "@scifamek-open-source/iraca/config";
import { DomainEvent } from "@scifamek-open-source/iraca/domain";

export interface ResendTicketSmsParam {
  eventId: string;
  ticketId: string;
}

export abstract class ResendTicketSmsUsecase extends Usecase<
  ResendTicketSmsParam,
  unknown
> {
  abstract call(param: ResendTicketSmsParam): Promise<DomainEvent>;
}
