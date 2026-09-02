import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertDomainEvent,
  assertHttpEvent,
  callUsecase,
  payloadOf,
} from "../../../iraca-testing";
import { EventContract } from "../domain/event.contract";
import { Event, PublicEvent, Ticket } from "../domain/event.entity";
import {
  EventCreatedDomainEvent,
  EventSoldOutDomainEvent,
  TicketAdmittedDomainEvent,
  TicketExitedDomainEvent,
  TicketNotFoundDomainEvent,
  TicketReservedDomainEvent,
} from "../domain/event.events";
import { LiveFeedContract } from "../domain/live-feed.contract";
import { SmsContract, SmsMessage } from "../domain/sms.contract";
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
}

class QuietSms extends SmsContract {
  async send(
    message: Omit<SmsMessage, "id" | "sentAt">,
  ): Promise<SmsMessage> {
    return { ...message, id: "sms-test", sentAt: new Date().toISOString() };
  }

  async list(): Promise<SmsMessage[]> {
    return [];
  }
}

class QuietFeed extends LiveFeedContract {
  async publish(_event: DomainEvent): Promise<void> {}
}

function app() {
  const events = new MemoryEvents();
  const sms = new QuietSms();
  const feed = new QuietFeed();
  return {
    create: new CreateEventUsecaseImpl(events, feed),
    reserve: new ReserveTicketUsecaseImpl(events, sms, feed),
    scan: new ScanTicketUsecaseImpl(events, feed),
  };
}

async function eventWithCupo(capacity = 1) {
  const usecases = app();
  const created = await callUsecase(usecases.create, {
    title: "Charla Iraca",
    startsAt: "2026-09-10T20:00:00.000Z",
    capacity,
  });
  assertDomainEvent(created, EventCreatedDomainEvent);
  return {
    ...usecases,
    eventId: payloadOf<PublicEvent>(created, EventCreatedDomainEvent).id,
  };
}

describe("Tiquetera con iraca-testing", () => {
  it("reservar emite TicketReservedDomainEvent", async () => {
    const { reserve, eventId } = await eventWithCupo(1);
    const reserved = await callUsecase(reserve, {
      eventId,
      attendeeName: "Ana Restrepo",
      phone: "3001234567",
    });
    assertDomainEvent(reserved, TicketReservedDomainEvent);
    const ticket = payloadOf<{ ticket: Ticket }>(
      reserved,
      TicketReservedDomainEvent,
    ).ticket;
    assert.match(ticket.code, /^TQT-/);

    assertHttpEvent(
      { meta: { code: `Events:${reserved.eventName}` }, data: reserved.payload },
      TicketReservedDomainEvent,
    );
  });

  it("sin cupo emite EventSoldOutDomainEvent (sigue siendo 200 en HTTP)", async () => {
    const { reserve, eventId } = await eventWithCupo(1);
    await callUsecase(reserve, {
      eventId,
      attendeeName: "Ana",
      phone: "3001112233",
    });
    const soldOut = await callUsecase(reserve, {
      eventId,
      attendeeName: "Bruno",
      phone: "3004445566",
    });
    assertDomainEvent(soldOut, EventSoldOutDomainEvent);
  });

  it("el scan alterna TicketAdmitted y TicketExited", async () => {
    const { reserve, scan, eventId } = await eventWithCupo(1);
    const reserved = await callUsecase(reserve, {
      eventId,
      attendeeName: "Ana",
      phone: "3001234567",
    });
    const code = payloadOf<{ ticket: Ticket }>(
      reserved,
      TicketReservedDomainEvent,
    ).ticket.code;

    const inGate = await callUsecase(scan, { code, gate: "Norte" });
    assertDomainEvent(inGate, TicketAdmittedDomainEvent);

    const outGate = await callUsecase(scan, { code, gate: "Norte" });
    assertDomainEvent(outGate, TicketExitedDomainEvent);
  });

  it("código inexistente emite TicketNotFoundDomainEvent", async () => {
    const { scan } = app();
    const missing = await callUsecase(scan, { code: "TQT-NOEXISTE" });
    assertDomainEvent(missing, TicketNotFoundDomainEvent);
  });
});
