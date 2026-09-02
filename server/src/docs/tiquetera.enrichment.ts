/**
 * Capa del bounded context. No va al core de Iraca.
 * El motor genérico vive en ../iraca-explorer y solo usa httpRoutesTable + inferencia.
 */
import { UsecaseEnrichment } from "../iraca-explorer";

export const tiqueteraExplorerEnrichment: Record<string, UsecaseEnrichment> = {
  CreateEventUsecase: {
    sample: {
      title: "Feria del café",
      startsAt: "2026-09-10T20:00:00.000Z",
      capacity: 40,
    },
    note: "Comando. El cupo nace en el agregado, no en Angular.",
  },
  ListPublishedEventsUsecase: {
    sample: null,
    note: "Consulta pública: sin PII de compradores.",
  },
  GetEventByIdUsecase: {
    sample: { id: "evt-palogrande" },
    note: "Lo usa Flutter. No incluye boletas.",
  },
  GetEventBoxOfficeUsecase: {
    sample: { id: "evt-palogrande" },
    note: "Lo usa el panel: tickets, QR, presencia, scans.",
  },
  ReserveTicketUsecase: {
    sample: {
      eventId: "evt-palogrande",
      attendeeName: "Ana Restrepo",
      phone: "3001234567",
    },
    note: "HTTP 200 tanto en TicketReservedDomainEvent como en EventSoldOutDomainEvent.",
  },
  ScanTicketUsecase: {
    sample: { code: "TQT-ANA2K4M8", gate: "Norte" },
    note: "Afuera entra; adentro sale. El scanner no guarda estado.",
  },
  CheckInTicketUsecase: {
    sample: { code: "TQT-BRUNOX4K", gate: "puerta" },
    note: "Alias de scan con gate puerta.",
  },
  VoidTicketUsecase: {
    sample: { eventId: "evt-palogrande", ticketId: "tkt-ana" },
    note: "Libera cupo solo si nunca ingresó.",
  },
  ResendTicketSmsUsecase: {
    sample: { eventId: "evt-palogrande", ticketId: "tkt-ana" },
    note: "Puerto SmsContract; no hay operador real.",
  },
  ListSmsOutboxUsecase: {
    sample: null,
    note: "Buzón en memoria del simulador.",
  },
};
