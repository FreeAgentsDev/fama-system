import { Event, Ticket } from "../domain/event.entity";
import { EventContract } from "../domain/event.contract";

export class InMemoryEventContract extends EventContract {
  private readonly events = new Map<string, Event>();

  async save(event: Event): Promise<Event> {
    const copy = this.clone(event);
    this.events.set(copy.id, copy);
    return this.clone(copy);
  }

  async getById(id: string): Promise<Event | null> {
    const found = this.events.get(id);
    return found ? this.clone(found) : null;
  }

  async getBySlug(slug: string): Promise<Event | null> {
    for (const event of this.events.values()) {
      if (event.slug === slug) {
        return this.clone(event);
      }
    }
    return null;
  }

  async listPublished(): Promise<Event[]> {
    return Array.from(this.events.values())
      .filter((event) => event.status !== "cancelled")
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((event) => this.clone(event));
  }

  async findByTicketCode(
    code: string,
  ): Promise<{ event: Event; ticket: Ticket } | null> {
    const upper = String(code ?? "").trim().toUpperCase();
    for (const event of this.events.values()) {
      const ticket = event.tickets.find((item) => item.code === upper);
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

  async findByTicketId(
    ticketId: string,
  ): Promise<{ event: Event; ticket: Ticket } | null> {
    for (const event of this.events.values()) {
      const ticket = event.tickets.find((item) => item.id === ticketId);
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
      stages: event.stages.map((stage) => ({ ...stage })),
      tickets: event.tickets.map((ticket) => ({
        ...ticket,
        scans: ticket.scans.map((scan) => ({ ...scan })),
      })),
    };
  }
}
