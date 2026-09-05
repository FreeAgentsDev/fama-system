import { Usecase } from "@scifamek-open-source/iraca/config";
import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import { Event, UpdateEventStageInput } from "../domain/event.entity";

export interface UpdateEventParam {
  eventId: string;
  name?: string;
  slug?: string;
  date?: string;
  venue?: string;
  coverImageUrl?: string | null;
  stages?: UpdateEventStageInput[];
}

export abstract class UpdateEventUsecase extends Usecase<UpdateEventParam, Event> {
  abstract call(param: UpdateEventParam): Promise<DomainEvent>;
}
