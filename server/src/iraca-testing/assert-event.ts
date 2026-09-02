import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import { describeValue, expectedNames } from "./describe";
import { EventKind, EventKindInput } from "./types";

export function isDomainEvent(value: unknown): value is DomainEvent {
  return value instanceof DomainEvent;
}

/**
 * El contrato de un Usecase: call() devuelve un DomainEvent, no un DTO ni un throw de negocio.
 */
export function assertDomainEvent<T = unknown>(
  result: unknown,
  kind: EventKindInput,
): asserts result is DomainEvent<T> {
  if (!isDomainEvent(result)) {
    throw new Error(
      `Se esperaba un DomainEvent, se obtuvo ${describeValue(result)}`,
    );
  }
  if (!result.is(kind as Parameters<DomainEvent["is"]>[0])) {
    throw new Error(
      `Se esperaba ${expectedNames(kind)}, se obtuvo ${result.eventName}`,
    );
  }
}

export function assertNotDomainEvent(
  result: unknown,
  kind: EventKind,
): void {
  if (!isDomainEvent(result)) {
    throw new Error(
      `Se esperaba un DomainEvent, se obtuvo ${describeValue(result)}`,
    );
  }
  if (result.is(kind as Parameters<DomainEvent["is"]>[0])) {
    throw new Error(`No se esperaba ${kind.eventName}`);
  }
}

export function payloadOf<T = unknown>(
  result: unknown,
  kind: EventKindInput,
): T {
  assertDomainEvent<T>(result, kind);
  return result.payload;
}
