import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import { EventContract } from "../domain/event.contract";
import {
  EventNotFoundDomainEvent,
  GottenEventDomainEvent,
} from "../domain/event.events";
import { toPublicEvent } from "../domain/event.entity";
import {
  GetEventByIdParam,
  GetEventByIdUsecase,
} from "./get-event-by-id.usecase";

export class GetEventByIdUsecaseImpl extends GetEventByIdUsecase {
  constructor(private eventContract: EventContract) {
    super();
  }

  async call(param: GetEventByIdParam): Promise<DomainEvent> {
    const event = await this.eventContract.getById(param?.id);
    if (!event) {
      return EventNotFoundDomainEvent({ id: param?.id });
    }
    return GottenEventDomainEvent(toPublicEvent(event));
  }
}
