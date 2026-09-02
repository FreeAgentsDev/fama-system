import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import { EventContract } from "../domain/event.contract";
import { EventCancelledDomainEvent, EventNotFoundDomainEvent } from "../domain/event.events";
import { hideEvent, toPublicEvent } from "../domain/event.entity";
import { HideEventParam, HideEventUsecase } from "./hide-event.usecase";

export class HideEventUsecaseImpl extends HideEventUsecase {
  constructor(private eventContract: EventContract) {
    super();
  }

  async call(param: HideEventParam): Promise<DomainEvent> {
    const event = await this.eventContract.getById(param?.eventId);
    if (!event) {
      return EventNotFoundDomainEvent({ id: param?.eventId });
    }
    const saved = await this.eventContract.save(hideEvent(event));
    return EventCancelledDomainEvent(toPublicEvent(saved));
  }
}
