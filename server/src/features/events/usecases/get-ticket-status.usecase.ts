import { Usecase } from "@scifamek-open-source/iraca/config";
import { DomainEvent } from "@scifamek-open-source/iraca/domain";

export interface GetTicketStatusParam {
  ticketId: string;
}

/**
 * Usado por `/[slug]/boleta/[ticketId]` — el `ticketId` (UUID) actúa como el "password" de la
 * página, igual que el `paymentRef` que ve Wompi. No requiere PIN de admin: es la boleta del
 * comprador, no datos ajenos.
 */
export abstract class GetTicketStatusUsecase extends Usecase<GetTicketStatusParam, unknown> {
  abstract call(param: GetTicketStatusParam): Promise<DomainEvent>;
}
