import { createHash, timingSafeEqual } from "node:crypto";

export interface WompiEventBody {
  event: string;
  data: {
    transaction: {
      id: string;
      status: "APPROVED" | "DECLINED" | "VOIDED" | "ERROR" | "PENDING";
      amount_in_cents: number;
      reference: string;
    };
  };
  timestamp: number;
  signature: {
    properties: string[];
    checksum: string;
  };
  environment: "test" | "prod";
}

/** Resuelve un path tipo "transaction.id" dentro de `data`. */
function resolvePath(data: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, data);
}

/**
 * Checksum de Wompi Colombia: SHA256 de la concatenación (en orden) de los valores de
 * `signature.properties`, seguido del `timestamp` y del secreto de eventos.
 * https://docs.wompi.co/en/docs/colombia/eventos/
 */
export function computeWompiChecksum(body: WompiEventBody, secret: string): string {
  const concatenatedProperties = body.signature.properties
    .map((path) => String(resolvePath(body.data, path) ?? ""))
    .join("");
  const raw = `${concatenatedProperties}${body.timestamp}${secret}`;
  return createHash("sha256").update(raw).digest("hex");
}

export function isValidWompiSignature(body: WompiEventBody, secret: string): boolean {
  if (
    !body?.signature?.checksum ||
    !Array.isArray(body?.signature?.properties) ||
    typeof body?.timestamp !== "number"
  ) {
    return false;
  }
  const expected = Buffer.from(computeWompiChecksum(body, secret), "hex");
  const received = Buffer.from(String(body.signature.checksum).toLowerCase(), "hex");
  if (expected.length === 0 || expected.length !== received.length) {
    return false;
  }
  return timingSafeEqual(expected, received);
}
