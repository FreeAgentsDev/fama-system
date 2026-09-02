import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import { EventKind, EventKindInput } from "./types";

export function expectedNames(kind: EventKindInput): string {
  return Array.isArray(kind)
    ? kind.map((item) => item.eventName).join(" | ")
    : kind.eventName;
}

export function describeValue(value: unknown): string {
  if (value instanceof DomainEvent) {
    return `DomainEvent(${value.eventName})`;
  }
  if (value === null) {
    return "null";
  }
  if (typeof value === "object" && value !== null) {
    const name = value.constructor?.name;
    return name && name !== "Object" ? name : "object";
  }
  return typeof value;
}

export function asKindList(kind: EventKindInput): EventKind[] {
  return Array.isArray(kind) ? kind : [kind];
}
