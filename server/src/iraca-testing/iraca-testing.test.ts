import { Usecase } from "@scifamek-open-source/iraca/config";
import { DomainEvent, DomainEventKind } from "@scifamek-open-source/iraca/domain";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertDomainEvent,
  assertHttpEvent,
  assertNotDomainEvent,
  callUsecase,
  parseMetaCode,
  payloadOf,
} from "./index";

const HelloSaidDomainEvent = DomainEventKind<{ name: string }>(
  "HelloSaidDomainEvent",
);
const NameMissingDomainEvent = DomainEventKind("NameMissingDomainEvent");

class SayHelloUsecase extends Usecase<{ name?: string }, { name: string }> {
  call(param?: { name?: string }): DomainEvent {
    if (!param?.name) {
      return NameMissingDomainEvent();
    }
    return HelloSaidDomainEvent({ name: param.name });
  }
}

describe("iraca-testing", () => {
  it("callUsecase + assertDomainEvent cubren el camino feliz", async () => {
    const result = await callUsecase(new SayHelloUsecase(), { name: "Ana" });
    assertDomainEvent(result, HelloSaidDomainEvent);
    assert.equal(payloadOf<{ name: string }>(result, HelloSaidDomainEvent).name, "Ana");
    assertNotDomainEvent(result, NameMissingDomainEvent);
  });

  it("acepta más de un DomainEvent (el Usecase no es CRUD)", async () => {
    const result = await callUsecase(new SayHelloUsecase(), {});
    assertDomainEvent(result, [HelloSaidDomainEvent, NameMissingDomainEvent]);
    assertDomainEvent(result, NameMissingDomainEvent);
  });

  it("parsea meta.code Identifier:EventName como lo serializa Iraca", () => {
    assert.deepEqual(parseMetaCode("Greetings:HelloSaidDomainEvent"), {
      identifier: "Greetings",
      eventName: "HelloSaidDomainEvent",
    });
    assertHttpEvent(
      { meta: { code: "Greetings:HelloSaidDomainEvent" }, data: { name: "Ana" } },
      HelloSaidDomainEvent,
    );
  });

  it("falla con el eventName real, no con un status HTTP", async () => {
    const result = await callUsecase(new SayHelloUsecase(), {});
    assert.throws(
      () => assertDomainEvent(result, HelloSaidDomainEvent),
      /HelloSaidDomainEvent[\s\S]*NameMissingDomainEvent/,
    );
  });
});
