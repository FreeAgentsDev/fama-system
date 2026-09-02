import { Usecase } from "@scifamek-open-source/iraca/config";
import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import { CreateEventStageInput, Event } from "../domain/event.entity";

export interface CreateEventParam {
  name: string;
  slug?: string;
  date: string | Date;
  venue?: string;
  coverImageUrl?: string;
  stages: CreateEventStageInput[];
}

export abstract class CreateEventUsecase extends Usecase<
  CreateEventParam,
  Event
> {
  abstract call(
    param: CreateEventParam,
  ): DomainEvent<Event> | Promise<DomainEvent<Event>>;
}
