import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EventContract } from "../domain/event.contract";
import { Event, PublicEvent, Ticket } from "../domain/event.entity";
import {
  EventCreatedDomainEvent,
  EventSoldOutDomainEvent,
  PaymentAlreadyProcessedDomainEvent,
  PaymentConfirmationUnauthorizedDomainEvent,
  TicketNotFoundDomainEvent,
  TicketPaymentConfirmedDomainEvent,
  TicketPaymentRejectedDomainEvent,
  TicketReservedDomainEvent,
  TicketVoidedDomainEvent,
} from "../domain/event.events";
import { LiveFeedContract } from "../domain/live-feed.contract";
import { ConfirmPaymentUsecaseImpl } from "./confirm-payment.usecase-impl";
import { CreateEventUsecaseImpl } from "./create-event.usecase-impl";
import { ReserveTicketUsecaseImpl } from "./reserve-ticket.usecase-impl";
import { ScanTicketUsecaseImpl } from "./scan-ticket.usecase-impl";

class MemoryEvents extends EventContract {
  private readonly store = new Map<string, Event>();

  async save(event: Event): Promise<Event> {
    this.store.set(event.id, event);
    return event;
  }

  async getById(id: string): Promise<Event | null> {
    return this.store.get(id) ?? null;
  }

  async getBySlug(slug: string): Promise<Event | null> {
    return [...this.store.values()].find((event) => event.slug === slug) ?? null;
  }

  async listPublished(): Promise<Event[]> {
    return [...this.store.values()];
  }

  async findByTicketCode(code: string) {
    const needle = String(code ?? "").toUpperCase();
    for (const event of this.store.values()) {
      const ticket = event.tickets.find((item) => item.code === needle);
      if (ticket) {
        return { event, ticket };
      }
    }
    return null;
  }

  async findByTicketId(ticketId: string) {
    for (const event of this.store.values()) {
      const ticket = event.tickets.find((item) => item.id === ticketId);
      if (ticket) {
        return { event, ticket };
      }
    }
    return null;
  }
}

class QuietFeed extends LiveFeedContract {
  async publish(_event: DomainEvent): Promise<void> {}
}

/** Asegura que `result` sea el DomainEvent esperado y devuelve su payload tipado. */
function expectEvent<T>(result: DomainEvent, kind: { eventName: string }): T {
  assert.ok(
    result.is(kind as Parameters<DomainEvent["is"]>[0]),
    `Se esperaba ${kind.eventName}, se obtuvo ${result.eventName}`,
  );
  return result.payload as T;
}

function app() {
  const events = new MemoryEvents();
  const feed = new QuietFeed();
  return {
    create: new CreateEventUsecaseImpl(events, feed),
    reserve: new ReserveTicketUsecaseImpl(events, feed),
    scan: new ScanTicketUsecaseImpl(events, feed),
    confirmPayment: new ConfirmPaymentUsecaseImpl(events, feed),
  };
}

async function eventWithCupo(capacity = 1) {
  const usecases = app();
  const created = await usecases.create.call({
    name: "Love House Session",
    date: "2026-09-10T20:00:00.000Z",
    stages: [{ name: "Preventa", price: 20000, capacity }],
  });
  const publicEvent = expectEvent<PublicEvent>(created, EventCreatedDomainEvent);
  return { ...usecases, eventId: publicEvent.id };
}

describe("Fama Boletería · usecases", () => {
  it("reservar emite TicketReservedDomainEvent con la boleta pending", async () => {
    const { reserve, eventId } = await eventWithCupo(1);
    const reserved = await reserve.call({
      eventId,
      attendeeName: "Ana Restrepo",
      phone: "3001234567",
    });
    const payload = expectEvent<{ ticket: Ticket }>(reserved, TicketReservedDomainEvent);
    assert.match(payload.ticket.code, /^TQT-/);
    assert.equal(payload.ticket.paymentStatus, "pending");
  });

  it("sin cupo emite EventSoldOutDomainEvent", async () => {
    const { reserve, eventId } = await eventWithCupo(1);
    await reserve.call({ eventId, attendeeName: "Ana", phone: "3001112233" });
    const soldOut = await reserve.call({
      eventId,
      attendeeName: "Bruno",
      phone: "3004445566",
    });
    expectEvent<PublicEvent>(soldOut, EventSoldOutDomainEvent);
  });

  it("no se puede escanear un ticket sin pago aprobado", async () => {
    const { reserve, scan, eventId } = await eventWithCupo(1);
    const reserved = await reserve.call({
      eventId,
      attendeeName: "Ana",
      phone: "3001234567",
    });
    const { ticket } = expectEvent<{ ticket: Ticket }>(reserved, TicketReservedDomainEvent);
    const scanResult = await scan.call({ code: ticket.code });
    // El dominio trata "pago no aprobado" igual que una boleta anulada de cara al portero.
    expectEvent(scanResult, TicketVoidedDomainEvent);
  });

  it("código inexistente emite TicketNotFoundDomainEvent", async () => {
    const { scan } = app();
    const missing = await scan.call({ code: "TQT-NOEXISTE" });
    expectEvent<{ code?: string }>(missing, TicketNotFoundDomainEvent);
  });
});

describe("ConfirmPaymentUsecase · webhook de Wompi", () => {
  const internalSecret = "test-secret";
  const previousSecret = process.env.INTERNAL_WEBHOOK_SECRET;

  async function withSecret<T>(run: () => Promise<T>): Promise<T> {
    process.env.INTERNAL_WEBHOOK_SECRET = internalSecret;
    try {
      return await run();
    } finally {
      process.env.INTERNAL_WEBHOOK_SECRET = previousSecret;
    }
  }

  it("rechaza la llamada si el internalSecret no coincide", async () => {
    await withSecret(async () => {
      const { reserve, confirmPayment, eventId } = await eventWithCupo(1);
      const reserved = await reserve.call({ eventId, attendeeName: "Ana", phone: "3001234567" });
      const { ticket } = expectEvent<{ ticket: Ticket }>(reserved, TicketReservedDomainEvent);

      const result = await confirmPayment.call({
        paymentReference: ticket.id,
        wompiTransactionId: "wompi-tx-1",
        status: "approved",
        internalSecret: "secreto-incorrecto",
      });
      expectEvent(result, PaymentConfirmationUnauthorizedDomainEvent);
    });
  });

  it("aprueba el pago, marca whatsappSent y arma el link de wa.me", async () => {
    await withSecret(async () => {
      const { reserve, confirmPayment, eventId } = await eventWithCupo(1);
      const reserved = await reserve.call({ eventId, attendeeName: "Ana", phone: "3001234567" });
      const { ticket } = expectEvent<{ ticket: Ticket }>(reserved, TicketReservedDomainEvent);

      const result = await confirmPayment.call({
        paymentReference: ticket.id,
        wompiTransactionId: "wompi-tx-1",
        status: "approved",
        internalSecret,
      });
      const payload = expectEvent<{ ticket: Ticket; whatsappLink: string }>(
        result,
        TicketPaymentConfirmedDomainEvent,
      );
      assert.equal(payload.ticket.paymentStatus, "approved");
      assert.equal(payload.ticket.whatsappSent, true);
      assert.match(payload.whatsappLink, /^https:\/\/wa\.me\/573001234567\?text=/);
    });
  });

  it("no aprueba dos veces el mismo pago", async () => {
    await withSecret(async () => {
      const { reserve, confirmPayment, eventId } = await eventWithCupo(1);
      const reserved = await reserve.call({ eventId, attendeeName: "Ana", phone: "3001234567" });
      const { ticket } = expectEvent<{ ticket: Ticket }>(reserved, TicketReservedDomainEvent);
      await confirmPayment.call({
        paymentReference: ticket.id,
        wompiTransactionId: "wompi-tx-1",
        status: "approved",
        internalSecret,
      });
      const again = await confirmPayment.call({
        paymentReference: ticket.id,
        wompiTransactionId: "wompi-tx-1",
        status: "approved",
        internalSecret,
      });
      expectEvent(again, PaymentAlreadyProcessedDomainEvent);
    });
  });

  it("un pago rechazado libera el cupo de la etapa para el siguiente comprador", async () => {
    await withSecret(async () => {
      const { reserve, confirmPayment, eventId } = await eventWithCupo(1);
      const reserved = await reserve.call({ eventId, attendeeName: "Ana", phone: "3001234567" });
      const { ticket } = expectEvent<{ ticket: Ticket }>(reserved, TicketReservedDomainEvent);

      const rejected = await confirmPayment.call({
        paymentReference: ticket.id,
        wompiTransactionId: "wompi-tx-2",
        status: "declined",
        internalSecret,
      });
      expectEvent(rejected, TicketPaymentRejectedDomainEvent);

      const retry = await reserve.call({ eventId, attendeeName: "Bruno", phone: "3004445566" });
      expectEvent(retry, TicketReservedDomainEvent);
    });
  });
});
