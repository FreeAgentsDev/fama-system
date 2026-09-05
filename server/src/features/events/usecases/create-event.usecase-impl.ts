import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import { EventContract } from "../domain/event.contract";
import { EventCreatedDomainEvent, EventSlugTakenDomainEvent } from "../domain/event.events";
import { createEvent, toPublicEvent } from "../domain/event.entity";
import { CreateEventParam, CreateEventUsecase } from "./create-event.usecase";
import { LiveFeedContract, announce } from "../domain/live-feed.contract";

export class CreateEventUsecaseImpl extends CreateEventUsecase {
  constructor(
    private eventContract: EventContract,
    private liveFeed: LiveFeedContract,
  ) {
    super();
  }

  async call(param: CreateEventParam): Promise<DomainEvent> {
    const event = createEvent(param);

    // El slug es la URL pública (`/[slug]`). Sin esta guarda, dos noches con el mismo nombre
    // quedaban con el mismo slug: la cartelera las mostraba duplicadas y /[slug] resolvía a
    // cualquiera de las dos.
    const clash = await this.eventContract.getBySlug(event.slug);
    if (clash) {
      return EventSlugTakenDomainEvent({
        slug: event.slug,
        existingEventId: clash.id,
      });
    }

    const saved = await this.eventContract.save(event);
    return announce(this.liveFeed, EventCreatedDomainEvent(toPublicEvent(saved)));
  }
}
