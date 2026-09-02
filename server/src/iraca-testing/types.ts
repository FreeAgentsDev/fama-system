import { DomainEvent } from "@scifamek-open-source/iraca/domain";

/** Lo que expone DomainEventKind: un factory con eventName. Iraca no lo exporta como tipo. */
export type EventKind = { eventName: string };

export type EventKindInput = EventKind | EventKind[];

export type CallableUsecase<Param = unknown> = {
  call(param?: Param): DomainEvent | Promise<DomainEvent>;
};

export type IracaHttpBody = {
  meta?: { code?: string; message?: string };
  data?: unknown;
};
