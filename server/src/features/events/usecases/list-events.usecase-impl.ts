import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import { EventContract } from "../domain/event.contract";
import { GottenAdminEventsDomainEvent } from "../domain/event.events";
import { toAdminEventSummary } from "../domain/event.entity";
import { ListEventsUsecase } from "./list-events.usecase";

export class ListEventsUsecaseImpl extends ListEventsUsecase {
  constructor(private eventContract: EventContract) {
    super();
  }

  async call(): Promise<DomainEvent> {
    const events = await this.eventContract.listAll();
    return GottenAdminEventsDomainEvent(events.map(toAdminEventSummary));
  }
}
