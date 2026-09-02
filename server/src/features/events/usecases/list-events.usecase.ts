import { Usecase } from "@scifamek-open-source/iraca/config";
import { DomainEvent } from "@scifamek-open-source/iraca/domain";

/** Usado por `/admin/eventos` — a diferencia de ListPublishedEventsUsecase, incluye los ocultos. */
export abstract class ListEventsUsecase extends Usecase<undefined, unknown> {
  abstract call(): Promise<DomainEvent>;
}
