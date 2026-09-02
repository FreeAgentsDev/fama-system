import { Usecase } from "@scifamek-open-source/iraca/config";
import { DomainEvent } from "@scifamek-open-source/iraca/domain";

export abstract class ListSmsOutboxUsecase extends Usecase<void, unknown> {
  abstract call(): Promise<DomainEvent>;
}
