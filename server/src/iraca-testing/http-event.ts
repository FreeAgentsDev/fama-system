import { asKindList, expectedNames } from "./describe";
import { EventKind, EventKindInput, IracaHttpBody } from "./types";

/**
 * Iraca pone meta.code = "Identifier:EventName" (el identifier del feature, no un status HTTP).
 */
export function parseMetaCode(code: string): {
  identifier: string | null;
  eventName: string;
} {
  const trimmed = code.trim();
  const splitAt = trimmed.lastIndexOf(":");
  if (splitAt === -1) {
    return { identifier: null, eventName: trimmed };
  }
  return {
    identifier: trimmed.slice(0, splitAt) || null,
    eventName: trimmed.slice(splitAt + 1),
  };
}

export function eventNameFromHttp(body: IracaHttpBody): string {
  return parseMetaCode(body.meta?.code ?? "").eventName;
}

export function assertHttpEvent(
  body: IracaHttpBody,
  kind: EventKindInput,
): void {
  const code = body.meta?.code ?? "";
  const { eventName } = parseMetaCode(code);
  const allowed = asKindList(kind).map((item: EventKind) => item.eventName);
  if (!allowed.includes(eventName)) {
    throw new Error(
      `Se esperaba meta.code …:${expectedNames(kind)}, se obtuvo ${code || "(vacío)"}`,
    );
  }
}
