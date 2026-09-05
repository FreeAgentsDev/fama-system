import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  boxOfficeStats,
  confirmPayment,
  createEvent,
  currentStage,
  hideEvent,
  issueCourtesyTicket,
  issueTicket,
  normalizePhone,
  publicPrice,
  publishEvent,
  rejectPayment,
  scanTicket,
  slugify,
  toAdminEventSummary,
  updateEvent,
  voidTicket,
} from "./event.entity";

function event() {
  return createEvent({
    name: "Love House Session",
    date: new Date("2026-09-01T20:00:00.000Z"),
    stages: [
      { name: "Preventa", price: 20000, capacity: 1 },
      { name: "Segunda", price: 40000, capacity: 1 },
    ],
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

describe("slugify", () => {
  it("normaliza tildes, espacios y mayúsculas", () => {
    assert.equal(slugify("Love House · 15 de Agosto"), "love-house-15-de-agosto");
  });
});

describe("agregado Event · etapas de precio", () => {
  it("usa la primera etapa con cupo disponible y calcula el precio público", () => {
    const evt = event();
    const stage = currentStage(evt);
    assert.equal(stage?.name, "Preventa");
    // 20000 / (1 - 0.029) = 20.597,32... -> ceil = 20598
    assert.equal(publicPrice(evt), 20598);
  });

  it("al agotar una etapa, pasa automáticamente a la siguiente", () => {
    const first = issueTicket(event(), "Ana Restrepo", "3001234567");
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.equal(first.ticket.stage, "Preventa");
    assert.equal(first.ticket.pricePaid, 20000);

    const second = issueTicket(first.event, "Bruno Mejía", "3009876543");
    assert.equal(second.ok, true);
    if (!second.ok) return;
    assert.equal(second.ticket.stage, "Segunda");
    assert.equal(second.ticket.pricePaid, 40000);
    assert.equal(second.event.status, "sold-out");
  });

  it("no vende más del cupo total", () => {
    const evt = createEvent({
      name: "Charla de arquitectura limpia",
      date: new Date("2026-09-02T20:00:00.000Z"),
      stages: [{ name: "Única", price: 10000, capacity: 1 }],
    });
    const first = issueTicket(evt, "Ana", "3001112233");
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.equal(first.event.status, "sold-out");
    const second = issueTicket(first.event, "Bruno", "3004445566");
    assert.equal(second.ok, false);
    if (second.ok) return;
    assert.equal(second.reason, "sold-out");
  });
});

describe("agregado Ticket · pagos Wompi", () => {
  it("el ticket nace pending y no se puede escanear hasta que se confirme el pago", () => {
    const issued = issueTicket(event(), "Ana", "3001234567");
    assert.equal(issued.ok, true);
    if (!issued.ok) return;
    assert.equal(issued.ticket.paymentStatus, "pending");

    const blocked = scanTicket(issued.event, issued.ticket.code, "Norte");
    assert.equal(blocked.ok, false);
    if (blocked.ok) return;
    assert.equal(blocked.reason, "not-approved");
  });

  it("confirmPayment aprueba el ticket y permite el ingreso", () => {
    const issued = issueTicket(event(), "Ana", "3001234567");
    assert.equal(issued.ok, true);
    if (!issued.ok) return;

    const confirmed = confirmPayment(issued.event, issued.ticket.id, "wompi-tx-1");
    assert.equal(confirmed.ok, true);
    if (!confirmed.ok) return;
    assert.equal(confirmed.ticket.paymentStatus, "approved");

    const admitted = scanTicket(confirmed.event, issued.ticket.code, "Norte");
    assert.equal(admitted.ok, true);
    if (!admitted.ok) return;
    assert.equal(admitted.outcome, "admitted");
    assert.equal(admitted.ticket.presence, "inside");
  });

  it("no se puede confirmar dos veces el mismo pago", () => {
    const issued = issueTicket(event(), "Ana", "3001234567");
    assert.equal(issued.ok, true);
    if (!issued.ok) return;
    const confirmed = confirmPayment(issued.event, issued.ticket.id, "wompi-tx-1");
    assert.equal(confirmed.ok, true);
    if (!confirmed.ok) return;
    const again = confirmPayment(confirmed.event, issued.ticket.id, "wompi-tx-1");
    assert.equal(again.ok, false);
    if (again.ok) return;
    assert.equal(again.reason, "already-processed");
  });

  it("rejectPayment libera el cupo de la etapa", () => {
    const evt = createEvent({
      name: "Charla de arquitectura limpia",
      date: new Date("2026-09-02T20:00:00.000Z"),
      stages: [{ name: "Única", price: 10000, capacity: 1 }],
    });
    const issued = issueTicket(evt, "Ana", "3001112233");
    assert.equal(issued.ok, true);
    if (!issued.ok) return;
    assert.equal(issued.event.status, "sold-out");

    const rejected = rejectPayment(issued.event, issued.ticket.id);
    assert.equal(rejected.ok, true);
    if (!rejected.ok) return;
    assert.equal(rejected.ticket.paymentStatus, "rejected");
    assert.equal(rejected.event.status, "published");

    const retry = issueTicket(rejected.event, "Bruno", "3004445566");
    assert.equal(retry.ok, true);
  });
});

describe("puerta · scan y anulación", () => {
  it("el scan alterna presencia y cuenta ingresos", () => {
    const issued = issueTicket(event(), "Ana", "3001234567");
    assert.equal(issued.ok, true);
    if (!issued.ok) return;
    const confirmed = confirmPayment(issued.event, issued.ticket.id);
    assert.equal(confirmed.ok, true);
    if (!confirmed.ok) return;

    const in1 = scanTicket(confirmed.event, issued.ticket.code, "Norte");
    assert.equal(in1.ok, true);
    if (!in1.ok) return;
    assert.equal(in1.outcome, "admitted");
    assert.equal(in1.ticket.entryCount, 1);

    const out = scanTicket(in1.event, issued.ticket.code, "Norte");
    assert.equal(out.ok, true);
    if (!out.ok) return;
    assert.equal(out.outcome, "exited");

    const in2 = scanTicket(out.event, issued.ticket.code, "Sur");
    assert.equal(in2.ok, true);
    if (!in2.ok) return;
    assert.equal(in2.ticket.entryCount, 2);
    assert.equal(boxOfficeStats(in2.event).inside, 1);
  });

  it("anular libera cupo y deja la boleta fuera de puerta", () => {
    const evt = createEvent({
      name: "Charla de arquitectura limpia",
      date: new Date("2026-09-02T20:00:00.000Z"),
      stages: [{ name: "Única", price: 10000, capacity: 1 }],
    });
    const issued = issueTicket(evt, "Ana", "3001234567");
    assert.equal(issued.ok, true);
    if (!issued.ok) return;
    const voided = voidTicket(issued.event, issued.ticket.id);
    assert.equal(voided.ok, true);
    if (!voided.ok) return;
    assert.equal(voided.ticket.status, "voided");
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

describe("admin · cortesías y visibilidad", () => {
  it("una cortesía queda aprobada de una vez, gratis, y consume cupo de la etapa vigente", () => {
    const evt = createEvent({
      name: "Noche de invitados",
      date: new Date("2026-09-03T20:00:00.000Z"),
      stages: [{ name: "Única", price: 20000, capacity: 2 }],
    });
    const result = issueCourtesyTicket(evt, "DJ Invitado", "3001234567");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.ticket.paymentStatus, "approved");
    assert.equal(result.ticket.pricePaid, 0);
    assert.equal(result.ticket.publicPrice, 0);
    assert.equal(result.event.stages[0].soldCount, 1);
    assert.equal(boxOfficeStats(result.event).revenue, 0);
  });

  it("una cortesía puede agotar la etapa igual que una boleta pagada", () => {
    const evt = createEvent({
      name: "Sala pequeña",
      date: new Date("2026-09-04T20:00:00.000Z"),
      stages: [{ name: "Única", price: 20000, capacity: 1 }],
    });
    const result = issueCourtesyTicket(evt, "Invitado", "3001234567");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.event.status, "sold-out");

    const rejected = issueCourtesyTicket(result.event, "Otro", "3009876543");
    assert.equal(rejected.ok, false);
    if (rejected.ok) return;
    assert.equal(rejected.reason, "sold-out");
  });

  it("hideEvent/publishEvent alternan el estado sin tocar tickets ni cupos", () => {
    const issued = issueTicket(event(), "Ana", "3001234567");
    assert.equal(issued.ok, true);
    if (!issued.ok) return;

    const hidden = hideEvent(issued.event);
    assert.equal(hidden.status, "cancelled");
    assert.equal(hidden.tickets.length, 1);

    const republished = publishEvent(hidden);
    assert.equal(republished.status, "published");
  });

  it("publishEvent respeta sold-out si ya no queda cupo", () => {
    const evt = createEvent({
      name: "Sala llena",
      date: new Date("2026-09-05T20:00:00.000Z"),
      stages: [{ name: "Única", price: 20000, capacity: 1 }],
    });
    const issued = issueTicket(evt, "Ana", "3001234567");
    assert.equal(issued.ok, true);
    if (!issued.ok) return;

    const hidden = hideEvent(issued.event);
    const republished = publishEvent(hidden);
    assert.equal(republished.status, "sold-out");
  });

  it("toAdminEventSummary resume vendidos/cupo y recaudo solo de pagos aprobados", () => {
    const issued = issueTicket(event(), "Ana", "3001234567");
    assert.equal(issued.ok, true);
    if (!issued.ok) return;
    const confirmed = confirmPayment(issued.event, issued.ticket.id);
    assert.equal(confirmed.ok, true);
    if (!confirmed.ok) return;

    const courtesy = issueCourtesyTicket(confirmed.event, "Invitado", "3009876543");
    assert.equal(courtesy.ok, true);
    if (!courtesy.ok) return;

    const summary = toAdminEventSummary(courtesy.event);
    assert.equal(summary.sold, 2);
    assert.equal(summary.capacity, 2);
    assert.equal(summary.revenue, 20000);
    // Preventa y Segunda ya se llenaron (1 pagada + 1 cortesía): no queda ninguna etapa vigente.
    assert.equal(summary.currentStageName, null);
  });
});

describe("updateEvent", () => {
  function conUnaVenta() {
    const sold = issueTicket(event(), "Ana", "3001234567");
    assert.ok(sold.ok);
    return sold.event;
  }

  it("edita nombre, sede y fecha sin tocar las etapas", () => {
    const next = updateEvent(event(), {
      name: "  Otra Noche  ",
      venue: "  Terraza  ",
      date: "2026-10-05T02:00:00.000Z",
    });
    assert.equal(next.name, "Otra Noche");
    assert.equal(next.venue, "Terraza");
    assert.equal(next.date, "2026-10-05T02:00:00.000Z");
    assert.equal(next.stages.length, 2);
  });

  it("deja el slug vacío cayendo al nombre", () => {
    const next = updateEvent(event(), { name: "Noche Fama", slug: "" });
    assert.equal(next.slug, "noche-fama");
  });

  it("preserva soldCount al cambiarle el precio a una etapa", () => {
    const next = updateEvent(conUnaVenta(), {
      stages: [
        { name: "Preventa", price: 25000, capacity: 1 },
        { name: "Segunda", price: 40000, capacity: 1 },
      ],
    });
    assert.equal(next.stages[0].price, 25000);
    assert.equal(next.stages[0].soldCount, 1);
  });

  it("no le recobra nada a quien ya compró cuando sube el precio", () => {
    const antes = conUnaVenta();
    const pagado = antes.tickets[0].pricePaid;
    const next = updateEvent(antes, {
      stages: [
        { name: "Preventa", price: 99000, capacity: 1 },
        { name: "Segunda", price: 40000, capacity: 1 },
      ],
    });
    assert.equal(next.tickets[0].pricePaid, pagado);
  });

  it("renombra una etapa y arrastra el nombre a los tickets", () => {
    const next = updateEvent(conUnaVenta(), {
      stages: [
        { name: "Early Bird", previousName: "Preventa", price: 20000, capacity: 1 },
        { name: "Segunda", price: 40000, capacity: 1 },
      ],
    });
    assert.equal(next.stages[0].name, "Early Bird");
    assert.equal(next.stages[0].soldCount, 1);
    assert.equal(next.tickets[0].stage, "Early Bird");
  });

  it("rechaza dejar el cupo por debajo de lo ya vendido", () => {
    assert.throws(
      () =>
        updateEvent(conUnaVenta(), {
          stages: [
            { name: "Preventa", price: 20000, capacity: 0 },
            { name: "Segunda", price: 40000, capacity: 1 },
          ],
        }),
      /mayor a 0/,
    );
  });

  it("rechaza quitar una etapa que ya vendió", () => {
    assert.throws(
      () =>
        updateEvent(conUnaVenta(), {
          stages: [{ name: "Segunda", price: 40000, capacity: 1 }],
        }),
      /No puedes quitar la etapa "Preventa"/,
    );
  });

  it("deja quitar una etapa que no vendió nada", () => {
    const next = updateEvent(event(), {
      stages: [{ name: "Preventa", price: 20000, capacity: 1 }],
    });
    assert.equal(next.stages.length, 1);
  });

  it("rechaza dos etapas con el mismo nombre", () => {
    assert.throws(
      () =>
        updateEvent(event(), {
          stages: [
            { name: "Preventa", price: 20000, capacity: 1 },
            { name: "Preventa", price: 40000, capacity: 1 },
          ],
        }),
      /dos etapas llamadas/,
    );
  });

  it("rechaza renombrar desde una etapa que no existe", () => {
    assert.throws(
      () =>
        updateEvent(event(), {
          stages: [
            { name: "X", previousName: "No Existe", price: 20000, capacity: 1 },
            { name: "Segunda", price: 40000, capacity: 1 },
          ],
        }),
      /No existe una etapa llamada/,
    );
  });

  it("un evento oculto sigue oculto después de editarlo", () => {
    const next = updateEvent(hideEvent(event()), { name: "Sigue Oculta" });
    assert.equal(next.status, "cancelled");
  });

  it("recalcula sold-out cuando el cupo nuevo ya está copado", () => {
    const lleno = updateEvent(conUnaVenta(), {
      stages: [{ name: "Preventa", price: 20000, capacity: 1 }],
    });
    assert.equal(lleno.status, "sold-out");
  });

  it("vuelve a published si le amplían el cupo a un sold-out", () => {
    const lleno = updateEvent(conUnaVenta(), {
      stages: [{ name: "Preventa", price: 20000, capacity: 1 }],
    });
    const ampliado = updateEvent(lleno, {
      stages: [{ name: "Preventa", price: 20000, capacity: 5 }],
    });
    assert.equal(ampliado.status, "published");
  });

  it("exige al menos una etapa", () => {
    assert.throws(() => updateEvent(event(), { stages: [] }), /al menos una etapa/);
  });
});

describe("toAdminEventSummary · ocupación", () => {
  it("cuenta como asistente a quien entró aunque ya se haya ido", () => {
    const sold = issueTicket(event(), "Ana", "3001234567");
    assert.ok(sold.ok);
    // Sin pago confirmado la puerta no deja entrar, así que el escaneo no contaría.
    const pagado = confirmPayment(sold.event, sold.ticket.id, "wompi-tx-1");
    assert.ok(pagado.ok);
    const dentro = scanTicket(pagado.event, sold.ticket.code, "puerta");
    assert.ok(dentro.ok);
    const fuera = scanTicket(dentro.event, sold.ticket.code, "puerta");
    assert.ok(fuera.ok);

    const resumen = toAdminEventSummary(fuera.event);
    assert.equal(resumen.inside, 0, "ya salió");
    assert.equal(resumen.outside, 1);
    assert.equal(resumen.attended, 1, "sigue contando como asistente de la noche");
    assert.equal(resumen.neverEntered, 0);
    assert.equal(resumen.entries, 1);
    assert.ok(resumen.lastScanAt);
  });

  it("separa a quien compró y nunca llegó", () => {
    const sold = issueTicket(event(), "Ana", "3001234567");
    assert.ok(sold.ok);
    const resumen = toAdminEventSummary(sold.event);
    assert.equal(resumen.attended, 0);
    assert.equal(resumen.neverEntered, 1);
    assert.equal(resumen.lastScanAt, undefined);
  });
});
