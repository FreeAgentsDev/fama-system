import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { computeWompiChecksum, isValidWompiSignature, type WompiEventBody } from "./wompi-signature.ts";

const SECRET = "test_events_secreto_de_pruebas";

/**
 * Cuerpo de evento con la forma real que manda Wompi. Se firma de verdad, no se pega un
 * checksum a mano: si alguien cambia el algoritmo, estos tests fallan por la razón correcta.
 */
function evento(overrides: Partial<WompiEventBody["data"]["transaction"]> = {}, secret = SECRET): WompiEventBody {
  const transaction = {
    id: "12181987-1788594735-61443",
    status: "APPROVED" as const,
    amount_in_cents: 1544800,
    reference: "adb088ea-ffed-415c-ac37-57e6c4fabdfd",
    ...overrides,
  };
  const timestamp = 1788594735;
  const properties = ["transaction.id", "transaction.status", "transaction.amount_in_cents"];
  const raw =
    `${transaction.id}${transaction.status}${transaction.amount_in_cents}` + `${timestamp}${secret}`;
  return {
    event: "transaction.updated",
    data: { transaction },
    timestamp,
    signature: { properties, checksum: createHash("sha256").update(raw).digest("hex") },
    environment: "test",
  };
}

describe("computeWompiChecksum", () => {
  it("concatena en el orden de signature.properties, luego timestamp y secreto", () => {
    const body = evento();
    // Se recalcula a mano el mismo string que describe la doc de Wompi.
    const esperado = createHash("sha256")
      .update(`12181987-1788594735-61443APPROVED15448001788594735${SECRET}`)
      .digest("hex");
    assert.equal(computeWompiChecksum(body, SECRET), esperado);
  });

  it("respeta el orden que venga en properties, no uno fijo", () => {
    const body = evento();
    const alReves: WompiEventBody = {
      ...body,
      signature: {
        ...body.signature,
        properties: ["transaction.amount_in_cents", "transaction.status", "transaction.id"],
      },
    };
    assert.notEqual(computeWompiChecksum(alReves, SECRET), computeWompiChecksum(body, SECRET));
  });
});

describe("isValidWompiSignature", () => {
  it("acepta un evento bien firmado", () => {
    assert.equal(isValidWompiSignature(evento(), SECRET), true);
  });

  it("acepta el checksum en mayúsculas: Wompi no garantiza el caso", () => {
    const body = evento();
    const enMayusculas: WompiEventBody = {
      ...body,
      signature: { ...body.signature, checksum: body.signature.checksum.toUpperCase() },
    };
    assert.equal(isValidWompiSignature(enMayusculas, SECRET), true);
  });

  it("rechaza si cambian el monto — es el ataque que importa", () => {
    // Firmado por 15.448 pero el cuerpo dice 1 peso: si esto pasara, cualquiera entraría
    // pagando lo que quiera.
    const body = evento();
    const manipulado: WompiEventBody = {
      ...body,
      data: { transaction: { ...body.data.transaction, amount_in_cents: 100 } },
    };
    assert.equal(isValidWompiSignature(manipulado, SECRET), false);
  });

  it("rechaza si cambian la referencia: no se puede reusar la firma de otra boleta", () => {
    const body = evento();
    const otraBoleta: WompiEventBody = {
      ...body,
      data: { transaction: { ...body.data.transaction, id: "otra-transaccion" } },
    };
    assert.equal(isValidWompiSignature(otraBoleta, SECRET), false);
  });

  it("rechaza si el estado pasa de DECLINED a APPROVED", () => {
    const declinado = evento({ status: "DECLINED" });
    const colado: WompiEventBody = {
      ...declinado,
      data: { transaction: { ...declinado.data.transaction, status: "APPROVED" } },
    };
    assert.equal(isValidWompiSignature(colado, SECRET), false);
  });

  it("rechaza un evento firmado con otro secreto", () => {
    assert.equal(isValidWompiSignature(evento({}, "secreto_de_otro_comercio"), SECRET), false);
  });

  it("rechaza cuerpos incompletos sin reventar", () => {
    const body = evento();
    const casos: unknown[] = [
      null,
      undefined,
      {},
      { ...body, signature: undefined },
      { ...body, signature: { ...body.signature, checksum: "" } },
      { ...body, signature: { ...body.signature, properties: "no-es-arreglo" } },
      { ...body, timestamp: "1788594735" },
    ];
    for (const caso of casos) {
      assert.equal(isValidWompiSignature(caso as WompiEventBody, SECRET), false);
    }
  });

  it("rechaza un checksum de largo distinto sin lanzar (timingSafeEqual exige igual largo)", () => {
    const body = evento();
    const corto: WompiEventBody = {
      ...body,
      signature: { ...body.signature, checksum: "abcd" },
    };
    // Si esto lanzara en vez de devolver false, el webhook respondería 500 y Wompi
    // reintentaría el evento en vez de darlo por rechazado.
    assert.doesNotThrow(() => isValidWompiSignature(corto, SECRET));
    assert.equal(isValidWompiSignature(corto, SECRET), false);
  });
});
