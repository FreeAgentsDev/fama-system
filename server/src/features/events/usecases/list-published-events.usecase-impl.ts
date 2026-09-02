import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import { EventContract } from "../domain/event.contract";
import { GottenEventsDomainEvent } from "../domain/event.events";
import { toPublicEvent } from "../domain/event.entity";
import { ListPublishedEventsUsecase } from "./list-published-events.usecase";

export class ListPublishedEventsUsecaseImpl extends ListPublishedEventsUsecase {
  constructor(private eventContract: EventContract) {
    super();
  }

  async call(): Promise<DomainEvent> {
    const events = await this.eventContract.listPublished();
    return GottenEventsDomainEvent(events.map(toPublicEvent));
  }
}
