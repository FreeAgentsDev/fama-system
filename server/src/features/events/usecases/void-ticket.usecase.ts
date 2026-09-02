import { Usecase } from "@scifamek-open-source/iraca/config";
import { DomainEvent } from "@scifamek-open-source/iraca/domain";

export interface VoidTicketParam {
  eventId: string;
  ticketId: string;
}

export abstract class VoidTicketUsecase extends Usecase<VoidTicketParam, unknown> {
  abstract call(param: VoidTicketParam): Promise<DomainEvent>;
}
