import { Usecase } from "@scifamek-open-source/iraca/config";
import { DomainEvent } from "@scifamek-open-source/iraca/domain";

export interface ScanTicketParam {
  code: string;
  gate?: string;
}

export abstract class ScanTicketUsecase extends Usecase<
  ScanTicketParam,
  unknown
> {
  abstract call(param: ScanTicketParam): Promise<DomainEvent>;
}
