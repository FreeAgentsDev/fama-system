import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import { EventContract } from "../domain/event.contract";
import {
  EventNotFoundDomainEvent,
  EventSlugTakenDomainEvent,
  EventUpdatedDomainEvent,
} from "../domain/event.events";
import { toPublicEvent, updateEvent } from "../domain/event.entity";
import { UpdateEventParam, UpdateEventUsecase } from "./update-event.usecase";
import { LiveFeedContract, announce } from "../domain/live-feed.contract";

export class UpdateEventUsecaseImpl extends UpdateEventUsecase {
  constructor(
    private eventContract: EventContract,
    private liveFeed: LiveFeedContract,
  ) {
    super();
  }

  async call(param: UpdateEventParam): Promise<DomainEvent> {
    const event = await this.eventContract.getById(param?.eventId);
    if (!event) {
      return EventNotFoundDomainEvent({ id: param?.eventId });
    }

    const updated = updateEvent(event, param);

    // El slug es la URL pública: si ya lo usa otra noche, /[slug] resolvería a cualquiera.
    if (updated.slug !== event.slug) {
      const clash = await this.eventContract.getBySlug(updated.slug);
      if (clash && clash.id !== event.id) {
        return EventSlugTakenDomainEvent({
          slug: updated.slug,
          existingEventId: clash.id,
        });
      }
    }

    const saved = await this.eventContract.save(updated);
    return announce(this.liveFeed, EventUpdatedDomainEvent(toPublicEvent(saved)));
  }
}
