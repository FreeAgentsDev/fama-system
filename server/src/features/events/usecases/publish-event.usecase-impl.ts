import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import { EventContract } from "../domain/event.contract";
import { EventNotFoundDomainEvent, EventPublishedDomainEvent } from "../domain/event.events";
import { publishEvent, toPublicEvent } from "../domain/event.entity";
import { PublishEventParam, PublishEventUsecase } from "./publish-event.usecase";

export class PublishEventUsecaseImpl extends PublishEventUsecase {
  constructor(private eventContract: EventContract) {
    super();
  }

  async call(param: PublishEventParam): Promise<DomainEvent> {
    const event = await this.eventContract.getById(param?.eventId);
    if (!event) {
      return EventNotFoundDomainEvent({ id: param?.eventId });
    }
    const saved = await this.eventContract.save(publishEvent(event));
    return EventPublishedDomainEvent(toPublicEvent(saved));
  }
}
