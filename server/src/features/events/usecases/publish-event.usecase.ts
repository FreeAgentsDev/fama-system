import { Usecase } from "@scifamek-open-source/iraca/config";
import { DomainEvent } from "@scifamek-open-source/iraca/domain";

export interface PublishEventParam {
  eventId: string;
}

/** `/admin/eventos` → botón "Publicar": reversa de HideEventUsecase. */
export abstract class PublishEventUsecase extends Usecase<PublishEventParam, unknown> {
  abstract call(param: PublishEventParam): Promise<DomainEvent>;
}
