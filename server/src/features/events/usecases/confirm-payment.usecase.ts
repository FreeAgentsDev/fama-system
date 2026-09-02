import { Usecase } from "@scifamek-open-source/iraca/config";
import { DomainEvent } from "@scifamek-open-source/iraca/domain";

export interface ConfirmPaymentParam {
  /** = ticket.id, la `reference` que se le pasó a Wompi al abrir el checkout. */
  paymentReference: string;
  wompiTransactionId: string;
  status: "approved" | "declined";
  /** Secreto compartido con el webhook de Next.js — evita que cualquiera confirme pagos directo. */
  internalSecret: string;
}

export abstract class ConfirmPaymentUsecase extends Usecase<ConfirmPaymentParam, unknown> {
  abstract call(param: ConfirmPaymentParam): Promise<DomainEvent>;
}
