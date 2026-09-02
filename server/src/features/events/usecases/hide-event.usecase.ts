import { Usecase } from "@scifamek-open-source/iraca/config";
import { DomainEvent } from "@scifamek-open-source/iraca/domain";

export interface HideEventParam {
  eventId: string;
}

/** `/admin/eventos` → botón "Ocultar": lo quita del listado público sin borrar tickets. */
export abstract class HideEventUsecase extends Usecase<HideEventParam, unknown> {
  abstract call(param: HideEventParam): Promise<DomainEvent>;
}
