import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  boxOfficeStats,
  createEvent,
  issueTicket,
  normalizePhone,
  scanTicket,
  voidTicket,
} from "./event.entity";

function event(capacity = 2) {
  return createEvent({
    title: "Charla DDD",
    startsAt: new Date("2026-09-01T20:00:00.000Z"),
    capacity,
  });
}

describe("normalizePhone", () => {
  it("acepta el number que Iraca produce con forceNumbers", () => {
    assert.equal(normalizePhone(3001234567), "3001234567");
  });

  it("acepta +57", () => {
    assert.equal(normalizePhone("+57 300 123 4567"), "3001234567");
  });

  it("rechaza un fijo", () => {
    assert.throws(() => normalizePhone("6041234567"), /celular colombiano/);
  });
});

describe("agregado Event", () => {
  it("emite boleta con QR y código SMS", () => {
    const result = issueTicket(event(), "Ana Restrepo", "3001234567");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.match(result.ticket.code, /^TQT-[A-Z2-9]{8}$/);
    assert.match(result.ticket.smsCode, /^\d{6}$/);
    assert.equal(result.event.reservedCount, 1);
    assert.equal(result.event.status, "published");
  });

  it("no vende más del cupo", () => {
    const first = issueTicket(event(1), "Ana", "3001112233");
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.equal(first.event.status, "sold-out");
    const second = issueTicket(first.event, "Bruno", "3004445566");
    assert.equal(second.ok, false);
    if (second.ok) return;
    assert.equal(second.reason, "sold-out");
  });

  it("el scan alterna presencia y cuenta ingresos", () => {
    const issued = issueTicket(event(), "Ana", "3001234567");
    assert.equal(issued.ok, true);
    if (!issued.ok) return;
    const in1 = scanTicket(issued.event, issued.ticket.code, "Norte");
    assert.equal(in1.ok, true);
    if (!in1.ok) return;
    assert.equal(in1.outcome, "admitted");
    assert.equal(in1.ticket.presence, "inside");
    assert.equal(in1.ticket.entryCount, 1);
    const out = scanTicket(in1.event, issued.ticket.code, "Norte");
    assert.equal(out.ok, true);
    if (!out.ok) return;
    assert.equal(out.outcome, "exited");
    assert.equal(out.ticket.presence, "outside");
    assert.equal(out.ticket.entryCount, 1);
    const in2 = scanTicket(out.event, issued.ticket.smsCode, "Sur");
    assert.equal(in2.ok, true);
    if (!in2.ok) return;
    assert.equal(in2.ticket.entryCount, 2);
    assert.equal(in2.ticket.scans.length, 3);
    assert.equal(boxOfficeStats(in2.event).inside, 1);
  });

  it("anular libera cupo y deja la boleta fuera de puerta", () => {
    const issued = issueTicket(event(1), "Ana", "3001234567");
    assert.equal(issued.ok, true);
    if (!issued.ok) return;
    const voided = voidTicket(issued.event, issued.ticket.id);
    assert.equal(voided.ok, true);
    if (!voided.ok) return;
    assert.equal(voided.ticket.status, "voided");
    assert.equal(voided.event.reservedCount, 0);
    assert.equal(voided.event.status, "published");
    const stats = boxOfficeStats(voided.event);
    assert.equal(stats.voided, 1);
    assert.equal(stats.pendingEntry, 0);
    const again = scanTicket(voided.event, issued.ticket.code, "Norte");
    assert.equal(again.ok, false);
    if (again.ok) return;
    assert.equal(again.reason, "voided");
  });
});
