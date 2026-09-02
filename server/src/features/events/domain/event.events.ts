import { DomainEventKind } from "@scifamek-open-source/iraca/domain";
import {
  BoxOfficeStats,
  Event,
  GateScan,
  PublicEvent,
  Ticket,
} from "./event.entity";

export const EventCreatedDomainEvent = DomainEventKind<PublicEvent>(
  "EventCreatedDomainEvent",
);

export const GottenEventsDomainEvent = DomainEventKind<PublicEvent[]>(
  "GottenEventsDomainEvent",
);

export const GottenEventDomainEvent = DomainEventKind<PublicEvent>(
  "GottenEventDomainEvent",
);

export const EventNotFoundDomainEvent = DomainEventKind<{ id: string }>(
  "EventNotFoundDomainEvent",
);

export const TicketReservedDomainEvent = DomainEventKind<{
  event: PublicEvent;
  ticket: Ticket;
}>("TicketReservedDomainEvent");

export const EventSoldOutDomainEvent = DomainEventKind<PublicEvent>(
  "EventSoldOutDomainEvent",
);

export const EventCancelledDomainEvent = DomainEventKind<PublicEvent>(
  "EventCancelledDomainEvent",
);

export const TicketAdmittedDomainEvent = DomainEventKind<{
  event: PublicEvent;
  ticket: Ticket;
  scan: GateScan;
}>("TicketAdmittedDomainEvent");

export const TicketExitedDomainEvent = DomainEventKind<{
  event: PublicEvent;
  ticket: Ticket;
  scan: GateScan;
}>("TicketExitedDomainEvent");

export const TicketCheckedInDomainEvent = TicketAdmittedDomainEvent;

export const TicketAlreadyCheckedInDomainEvent = DomainEventKind<{
  ticket: Ticket;
}>("TicketAlreadyCheckedInDomainEvent");

export const TicketVoidedDomainEvent = DomainEventKind<{
  event: PublicEvent;
  ticket: Ticket;
}>("TicketVoidedDomainEvent");

export const TicketNotFoundDomainEvent = DomainEventKind<{ code?: string; ticketId?: string }>(
  "TicketNotFoundDomainEvent",
);

export const TicketCannotBeVoidedDomainEvent = DomainEventKind<{ ticketId: string }>(
  "TicketCannotBeVoidedDomainEvent",
);

export const GottenBoxOfficeDomainEvent = DomainEventKind<{
  event: Event;
  stats: BoxOfficeStats;
  recentScans: Array<
    GateScan & { ticketId: string; attendeeName: string; code: string }
  >;
}>("GottenBoxOfficeDomainEvent");

/** Emitido por ConfirmPaymentUsecase (Fase 3) cuando Wompi confirma el pago. */
export const TicketPaymentConfirmedDomainEvent = DomainEventKind<{
  event: PublicEvent;
  ticket: Ticket;
  whatsappLink: string;
}>("TicketPaymentConfirmedDomainEvent");

/** Emitido cuando Wompi reporta la transacción como rechazada/fallida. */
export const TicketPaymentRejectedDomainEvent = DomainEventKind<{
  event: PublicEvent;
  ticket: Ticket;
}>("TicketPaymentRejectedDomainEvent");

/** El webhook de Wompi puede reintentar entregas; este evento evita procesar dos veces. */
export const PaymentAlreadyProcessedDomainEvent = DomainEventKind<{ ticketId: string }>(
  "PaymentAlreadyProcessedDomainEvent",
);
