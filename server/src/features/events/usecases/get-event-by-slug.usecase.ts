import { Usecase } from "@scifamek-open-source/iraca/config";
import { DomainEvent } from "@scifamek-open-source/iraca/domain";

export interface GetEventBySlugParam {
  slug: string;
}

/** Usado por `/[slug]` (Fase 6) — la página pública que Daniel comparte en Instagram/WhatsApp. */
export abstract class GetEventBySlugUsecase extends Usecase<GetEventBySlugParam, unknown> {
  abstract call(param: GetEventBySlugParam): Promise<DomainEvent>;
}
