import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import { EventContract } from "../domain/event.contract";
import { EventCreatedDomainEvent } from "../domain/event.events";
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
    const saved = await this.eventContract.save(event);
    return announce(this.liveFeed, EventCreatedDomainEvent(toPublicEvent(saved)));
  }
}
