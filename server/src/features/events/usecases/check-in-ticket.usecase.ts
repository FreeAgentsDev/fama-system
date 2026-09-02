import { Usecase } from "@scifamek-open-source/iraca/config";
import { DomainEvent } from "@scifamek-open-source/iraca/domain";

export interface CheckInTicketParam {
  code: string;
  gate?: string;
}

export abstract class CheckInTicketUsecase extends Usecase<
  CheckInTicketParam,
  unknown
> {
  abstract call(param: CheckInTicketParam): Promise<DomainEvent>;
}
