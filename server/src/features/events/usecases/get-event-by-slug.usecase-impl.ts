import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import { EventContract } from "../domain/event.contract";
import { EventNotFoundDomainEvent, GottenEventDomainEvent } from "../domain/event.events";
import { toPublicEvent } from "../domain/event.entity";
import { GetEventBySlugParam, GetEventBySlugUsecase } from "./get-event-by-slug.usecase";
import { releaseStaleHolds } from "./release-stale-holds";

export class GetEventBySlugUsecaseImpl extends GetEventBySlugUsecase {
  constructor(private eventContract: EventContract) {
    super();
  }

  async call(param: GetEventBySlugParam): Promise<DomainEvent> {
    const stored = await this.eventContract.getBySlug(param?.slug);
    if (!stored) {
      return EventNotFoundDomainEvent({ id: param?.slug });
    }
    const event = await releaseStaleHolds(this.eventContract, stored);
    return GottenEventDomainEvent(toPublicEvent(event));
  }
}
