import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import { EventContract } from "../domain/event.contract";
import { EventNotFoundDomainEvent, GottenEventDomainEvent } from "../domain/event.events";
import { toPublicEvent } from "../domain/event.entity";
import { GetEventBySlugParam, GetEventBySlugUsecase } from "./get-event-by-slug.usecase";

export class GetEventBySlugUsecaseImpl extends GetEventBySlugUsecase {
  constructor(private eventContract: EventContract) {
    super();
  }

  async call(param: GetEventBySlugParam): Promise<DomainEvent> {
    const event = await this.eventContract.getBySlug(param?.slug);
    if (!event) {
      return EventNotFoundDomainEvent({ id: param?.slug });
    }
    return GottenEventDomainEvent(toPublicEvent(event));
  }
}
