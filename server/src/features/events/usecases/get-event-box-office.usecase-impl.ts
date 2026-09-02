import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import { EventContract } from "../domain/event.contract";
import {
  EventNotFoundDomainEvent,
  GottenBoxOfficeDomainEvent,
} from "../domain/event.events";
import { boxOfficeStats, recentScans } from "../domain/event.entity";
import {
  GetEventBoxOfficeParam,
  GetEventBoxOfficeUsecase,
} from "./get-event-box-office.usecase";

export class GetEventBoxOfficeUsecaseImpl extends GetEventBoxOfficeUsecase {
  constructor(private eventContract: EventContract) {
    super();
  }

  async call(param: GetEventBoxOfficeParam): Promise<DomainEvent> {
    const event = await this.eventContract.getById(param?.id);
    if (!event) {
      return EventNotFoundDomainEvent({ id: param?.id });
    }
    return GottenBoxOfficeDomainEvent({
      event,
      stats: boxOfficeStats(event),
      recentScans: recentScans(event),
    });
  }
}
