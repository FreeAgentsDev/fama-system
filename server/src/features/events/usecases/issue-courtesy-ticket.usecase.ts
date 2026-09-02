import { Usecase } from "@scifamek-open-source/iraca/config";
import { DomainEvent } from "@scifamek-open-source/iraca/domain";

export interface IssueCourtesyTicketParam {
  eventId: string;
  attendeeName: string;
  phone: string;
}

/** `/admin/eventos/[id]` → "Marcar como cortesía": boleta gratis, sin pasar por Wompi. */
export abstract class IssueCourtesyTicketUsecase extends Usecase<
  IssueCourtesyTicketParam,
  unknown
> {
  abstract call(param: IssueCourtesyTicketParam): Promise<DomainEvent>;
}
