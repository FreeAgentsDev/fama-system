import { Event, Ticket } from "./event.entity";

export abstract class EventContract {
  abstract save(event: Event): Promise<Event>;
  abstract getById(id: string): Promise<Event | null>;
  abstract getBySlug(slug: string): Promise<Event | null>;
  abstract listPublished(): Promise<Event[]>;
  /** Para `/admin/eventos`: todos los eventos, incluyendo ocultos ("cancelled"). */
  abstract listAll(): Promise<Event[]>;
  abstract findByTicketCode(
    code: string,
  ): Promise<{ event: Event; ticket: Ticket } | null>;
  abstract findByTicketId(
    ticketId: string,
  ): Promise<{ event: Event; ticket: Ticket } | null>;
}
