import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractDomainEvents,
  inferSampleFromParam,
} from "./infer";

describe("iraca-explorer infer", () => {
  it("saca DomainEvent de las llamadas, no de DomainEventKind", () => {
    const source = `
      return TicketReservedDomainEvent({ ticket });
      if (!ok) return EventSoldOutDomainEvent(event);
      const factory = DomainEventKind("NopeDomainEvent");
    `;
    assert.deepEqual(extractDomainEvents(source), [
      "TicketReservedDomainEvent",
      "EventSoldOutDomainEvent",
    ]);
  });

  it("arma un sample vacío a partir del *Param", () => {
    const source = `
      export interface ReserveTicketParam {
        eventId: string;
        capacity: number;
        vip?: boolean;
      }
    `;
    assert.deepEqual(inferSampleFromParam(source), {
      eventId: "",
      capacity: 0,
      vip: false,
    });
  });
});
