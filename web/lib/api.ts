/** Cliente delgado hacia el server de Iraca. Todo endpoint sigue el patrón de sobre {meta, data}. */

const IRACA_URL = process.env.NEXT_PUBLIC_IRACA_URL ?? "http://localhost:2436";

interface IracaEnvelope<T> {
  meta: { code: string };
  data: T;
}

export class IracaRequestError extends Error {
  constructor(
    public readonly eventName: string,
    message: string,
  ) {
    super(message);
    this.name = "IracaRequestError";
  }
}

function eventNameOf(code: string): string {
  return code.split(":").pop() ?? code;
}

async function postToIraca<T>(path: string, body: unknown): Promise<IracaEnvelope<T>> {
  const res = await fetch(`${IRACA_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return (await res.json()) as IracaEnvelope<T>;
}

async function getFromIraca<T>(path: string): Promise<IracaEnvelope<T>> {
  const res = await fetch(`${IRACA_URL}${path}`, { cache: "no-store" });
  return (await res.json()) as IracaEnvelope<T>;
}

export interface PriceStage {
  name: string;
  price: number;
  capacity: number;
  soldCount: number;
}

export interface PublicEvent {
  id: string;
  name: string;
  slug: string;
  date: string;
  venue: string;
  coverImageUrl?: string;
  status: "published" | "sold-out" | "cancelled";
  currentStage: PriceStage | null;
  publicPrice: number;
  remaining: number;
  inside: number;
  outside: number;
  entries: number;
}

export interface ReservedTicket {
  id: string;
  code: string;
  attendeeName: string;
  phone: string;
  publicPrice: number;
  pricePaid: number;
  paymentRef?: string;
  paymentStatus: "pending" | "approved" | "rejected";
}

export async function listPublishedEvents(): Promise<PublicEvent[]> {
  const result = await getFromIraca<PublicEvent[]>("/events/list-published-events");
  const eventName = eventNameOf(result.meta.code);
  if (eventName !== "GottenEventsDomainEvent") {
    throw new IracaRequestError(eventName, "No se pudieron cargar los eventos.");
  }
  return result.data;
}

export async function getEventById(id: string): Promise<PublicEvent> {
  const result = await getFromIraca<PublicEvent>(`/events/get-event-by-id?id=${encodeURIComponent(id)}`);
  const eventName = eventNameOf(result.meta.code);
  if (eventName !== "GottenEventDomainEvent") {
    throw new IracaRequestError(eventName, "No se encontró el evento.");
  }
  return result.data;
}

/** Usado por `/[slug]` — la página pública que Daniel comparte en Instagram/WhatsApp. */
export async function getEventBySlug(slug: string): Promise<PublicEvent> {
  const result = await getFromIraca<PublicEvent>(
    `/events/get-event-by-slug?slug=${encodeURIComponent(slug)}`,
  );
  const eventName = eventNameOf(result.meta.code);
  if (eventName !== "GottenEventDomainEvent") {
    throw new IracaRequestError(eventName, "No se encontró el evento.");
  }
  return result.data;
}

export interface PublicTicketView {
  code: string;
  attendeeName: string;
  stage: string;
  paymentStatus: "pending" | "approved" | "rejected";
}

/** Usado por `/[slug]/boleta/[ticketId]` — a donde redirige Wompi y apunta el link de WhatsApp. */
export async function getTicketStatus(
  ticketId: string,
): Promise<{ event: PublicEvent; ticket: PublicTicketView }> {
  const result = await getFromIraca<{ event: PublicEvent; ticket: PublicTicketView }>(
    `/events/get-ticket-status?ticketId=${encodeURIComponent(ticketId)}`,
  );
  const eventName = eventNameOf(result.meta.code);
  if (eventName !== "GottenTicketStatusDomainEvent") {
    throw new IracaRequestError(eventName, "No se encontró la boleta.");
  }
  return result.data;
}

export interface ReserveTicketInput {
  eventId: string;
  attendeeName: string;
  phone: string;
}

export type ScanOutcome =
  | { kind: "admitted"; attendeeName: string }
  | { kind: "exited"; attendeeName: string }
  | { kind: "rejected"; reason: "voided" | "not-found" };

interface ScanTicketResponseTicket {
  attendeeName: string;
}

/** Llamado desde `/puerta` (scanner). El código viene del QR: `TQT-XXXXXXXX`. */
export async function scanTicket(code: string, gate?: string): Promise<ScanOutcome> {
  const result = await postToIraca<{ ticket?: ScanTicketResponseTicket }>("/events/scan-ticket", {
    code,
    gate,
  });
  const eventName = eventNameOf(result.meta.code);
  switch (eventName) {
    case "TicketAdmittedDomainEvent":
      return { kind: "admitted", attendeeName: result.data.ticket!.attendeeName };
    case "TicketExitedDomainEvent":
      return { kind: "exited", attendeeName: result.data.ticket!.attendeeName };
    case "TicketVoidedDomainEvent":
      return { kind: "rejected", reason: "voided" };
    default:
      return { kind: "rejected", reason: "not-found" };
  }
}

export async function reserveTicket(input: ReserveTicketInput): Promise<ReservedTicket> {
  const result = await postToIraca<{ event: PublicEvent; ticket: ReservedTicket }>(
    "/events/reserve-ticket",
    input,
  );
  const eventName = eventNameOf(result.meta.code);
  if (eventName !== "TicketReservedDomainEvent") {
    const message =
      eventName === "EventSoldOutDomainEvent"
        ? "Esta etapa se agotó justo ahora. Refresca la página para ver el precio vigente."
        : "No se pudo apartar la boleta. Intenta de nuevo.";
    throw new IracaRequestError(eventName, message);
  }
  return result.data.ticket;
}
