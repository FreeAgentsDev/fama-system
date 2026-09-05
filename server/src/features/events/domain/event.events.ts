import { DomainEventKind } from "@scifamek-open-source/iraca/domain";
import {
  AdminEventSummary,
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

/**
 * El slug ya lo usa otro evento. El slug es la URL pública (`/[slug]`), así que si se
 * repite la página resolvería a cualquiera de los dos y la cartelera mostraría las dos
 * noches con el mismo link.
 */
export const EventSlugTakenDomainEvent = DomainEventKind<{
  slug: string;
  existingEventId: string;
}>("EventSlugTakenDomainEvent");

export const TicketReservedDomainEvent = DomainEventKind<{
  event: PublicEvent;
  ticket: Ticket;
  /** Firma de integridad para el widget de Wompi. `undefined` si no hay `WOMPI_INTEGRITY_SECRET`
   *  configurado (ej. en local sin llaves) — el botón de pago la omite en ese caso. */
  wompiSignature?: string;
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

/** El `internalSecret` de ConfirmPaymentParam no coincide: alguien intenta llamar el endpoint sin pasar por el webhook de Wompi. */
export const PaymentConfirmationUnauthorizedDomainEvent = DomainEventKind<{ reason: string }>(
  "PaymentConfirmationUnauthorizedDomainEvent",
);

/** `/admin/eventos` — lista liviana de TODOS los eventos (publicados, agotados y ocultos). */
export const GottenAdminEventsDomainEvent = DomainEventKind<AdminEventSummary[]>(
  "GottenAdminEventsDomainEvent",
);

/** Emitido por IssueCourtesyTicketUsecase (Fase 4) — boleta gratis creada desde el admin. */
export const CourtesyTicketIssuedDomainEvent = DomainEventKind<{
  event: PublicEvent;
  ticket: Ticket;
  whatsappLink: string;
}>("CourtesyTicketIssuedDomainEvent");

/** Emitido por UpdateEventUsecase — el admin editó datos o etapas de una noche ya creada. */
export const EventUpdatedDomainEvent = DomainEventKind<PublicEvent>(
  "EventUpdatedDomainEvent",
);

/** Emitido por PublishEventUsecase (Fase 4) — reversa de EventCancelledDomainEvent ("Ocultar"). */
export const EventPublishedDomainEvent = DomainEventKind<PublicEvent>(
  "EventPublishedDomainEvent",
);

/**
 * Usado por `/[slug]/boleta/[ticketId]` (Fase 6) — vista pública mínima de una boleta propia,
 * suficiente para mostrar el QR sin exponer más de lo que el comprador ya sabe (su nombre/etapa).
 */
export const GottenTicketStatusDomainEvent = DomainEventKind<{
  event: PublicEvent;
  ticket: {
    code: string;
    attendeeName: string;
    stage: string;
    paymentStatus: Ticket["paymentStatus"];
  };
}>("GottenTicketStatusDomainEvent");
