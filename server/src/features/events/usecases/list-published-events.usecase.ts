import { Usecase } from "@scifamek-open-source/iraca/config";
import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import { Event } from "../domain/event.entity";

export abstract class ListPublishedEventsUsecase extends Usecase<
  void,
  Event[]
> {
  abstract call(): DomainEvent<Event[]> | Promise<DomainEvent<Event[]>>;
}
