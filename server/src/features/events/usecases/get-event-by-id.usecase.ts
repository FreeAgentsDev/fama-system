import { Usecase } from "@scifamek-open-source/iraca/config";
import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import { Event } from "../domain/event.entity";

export interface GetEventByIdParam {
  id: string;
}

export abstract class GetEventByIdUsecase extends Usecase<
  GetEventByIdParam,
  Event
> {
  abstract call(param: GetEventByIdParam): Promise<DomainEvent>;
}
