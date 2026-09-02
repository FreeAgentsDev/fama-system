import { Usecase } from "@scifamek-open-source/iraca/config";
import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import { Event } from "../domain/event.entity";

export interface CreateEventParam {
  title: string;
  startsAt: string | Date;
  capacity: number;
}

export abstract class CreateEventUsecase extends Usecase<
  CreateEventParam,
  Event
> {
  abstract call(
    param: CreateEventParam,
  ): DomainEvent<Event> | Promise<DomainEvent<Event>>;
}
