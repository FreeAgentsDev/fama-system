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

export interface ReserveTicketInput {
  eventId: string;
  attendeeName: string;
  phone: string;
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
