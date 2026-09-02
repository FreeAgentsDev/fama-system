import { Event, Ticket } from "../domain/event.entity";
import { EventContract } from "../domain/event.contract";

export class InMemoryEventContract extends EventContract {
  private readonly events = new Map<string, Event>();

  constructor() {
    super();
    this.seed();
  }

  async save(event: Event): Promise<Event> {
    const copy = this.clone(event);
    this.events.set(copy.id, copy);
    return this.clone(copy);
  }

  async getById(id: string): Promise<Event | null> {
    const found = this.events.get(id);
    return found ? this.clone(found) : null;
  }

  async listPublished(): Promise<Event[]> {
    return Array.from(this.events.values())
      .filter((event) => event.status !== "cancelled")
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .map((event) => this.clone(event));
  }

  async findByTicketCode(
    code: string,
  ): Promise<{ event: Event; ticket: Ticket } | null> {
    const raw = String(code ?? "").trim();
    const upper = raw.toUpperCase();
    for (const event of this.events.values()) {
      const ticket = event.tickets.find(
        (item) => item.code === upper || item.smsCode === raw,
      );
      if (ticket) {
        const cloned = this.clone(event);
        return {
          event: cloned,
          ticket: cloned.tickets.find((item) => item.id === ticket.id)!,
        };
      }
    }
    return null;
  }

  private clone(event: Event): Event {
    return {
      ...event,
      tickets: event.tickets.map((ticket) => ({
        ...ticket,
        scans: ticket.scans.map((scan) => ({ ...scan })),
      })),
    };
  }

  private seed(): void {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const halfHour = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const tenMin = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    this.events.set("evt-palogrande", {
      id: "evt-palogrande",
      title: "Concierto en el Palogrande",
      startsAt: nextWeek.toISOString(),
      capacity: 20,
      reservedCount: 3,
      status: "published",
      tickets: [
        {
          id: "tkt-ana",
          code: "TQT-ANA2K4M8",
          attendeeName: "Ana Restrepo",
          phone: "3001234567",
          createdAt: hourAgo,
          status: "issued",
          presence: "outside",
          entryCount: 0,
          scans: [],
          smsCode: "111222",
          smsSentAt: hourAgo,
          smsCount: 1,
        },
        {
          id: "tkt-bruno",
          code: "TQT-BRUNOX4K",
          attendeeName: "Bruno Mejía",
          phone: "3009876543",
          createdAt: hourAgo,
          status: "checked-in",
          presence: "inside",
          entryCount: 1,
          scans: [{ at: halfHour, gate: "Norte", result: "admitted" }],
          smsCode: "333444",
          smsSentAt: hourAgo,
          smsCount: 1,
          checkedInAt: halfHour,
          lastScanAt: halfHour,
        },
        {
          id: "tkt-carla",
          code: "TQT-CARLA9P2",
          attendeeName: "Carla Duque",
          phone: "3015556677",
          createdAt: hourAgo,
          status: "checked-in",
          presence: "inside",
          entryCount: 2,
          scans: [
            { at: hourAgo, gate: "Norte", result: "admitted" },
            { at: halfHour, gate: "Norte", result: "exited" },
            { at: tenMin, gate: "Sur", result: "admitted" },
          ],
          smsCode: "555666",
          smsSentAt: hourAgo,
          smsCount: 1,
          checkedInAt: hourAgo,
          lastScanAt: tenMin,
        },
      ],
    });

    this.events.set("evt-cupo-uno", {
      id: "evt-cupo-uno",
      title: "Charla de arquitectura limpia",
      startsAt: tomorrow.toISOString(),
      capacity: 1,
      reservedCount: 0,
      status: "published",
      tickets: [],
    });
  }
}
