import { Event, Ticket } from "./event.entity";

export abstract class EventContract {
  abstract save(event: Event): Promise<Event>;
  abstract getById(id: string): Promise<Event | null>;
  abstract listPublished(): Promise<Event[]>;
  abstract findByTicketCode(
    code: string,
  ): Promise<{ event: Event; ticket: Ticket } | null>;
}
