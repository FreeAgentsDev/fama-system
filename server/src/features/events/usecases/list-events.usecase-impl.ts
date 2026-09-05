import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import { EventContract } from "../domain/event.contract";
import { GottenAdminEventsDomainEvent } from "../domain/event.events";
import { toAdminEventSummary } from "../domain/event.entity";
import { ListEventsUsecase } from "./list-events.usecase";
import { releaseStaleHoldsAll } from "./release-stale-holds";

export class ListEventsUsecaseImpl extends ListEventsUsecase {
  constructor(private eventContract: EventContract) {
    super();
  }

  async call(): Promise<DomainEvent> {
    const stored = await this.eventContract.listAll();
    const events = await releaseStaleHoldsAll(this.eventContract, stored);
    return GottenAdminEventsDomainEvent(events.map(toAdminEventSummary));
  }
}
