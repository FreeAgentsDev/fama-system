export type EventStatus = "published" | "sold-out" | "cancelled";
export type TicketStatus = "issued" | "checked-in" | "voided";
export type Presence = "outside" | "inside";
export type ScanResult = "admitted" | "exited" | "rejected-voided";
export type PaymentStatus = "pending" | "approved" | "rejected";

/** Comisión de Wompi que se absorbe en el precio público (no en lo que recibe Daniel). */
export const WOMPI_FEE_RATE = 0.029;

export interface GateScan {
  at: string;
  gate: string;
  result: ScanResult;
}

/** Etapa de precio de un evento (Preventa, Segunda, Puerta, ...). */
export interface PriceStage {
  name: string;
  /** Precio en COP que recibe Daniel, sin comisión de Wompi. */
  price: number;
  capacity: number;
  soldCount: number;
}

export interface Ticket {
  id: string;
  /** TQT-XXXXXXXX — también es el código QR que se escanea en la puerta. */
  code: string;
  attendeeName: string;
  phone: string;
  createdAt: string;
  /** Nombre de la etapa vigente al momento de la compra. */
  stage: string;
  /** Lo que recibe Daniel (precio de la etapa). */
  pricePaid: number;
  /** Lo que pagó el comprador (incluye la comisión de Wompi). */
  publicPrice: number;
  /** Referencia enviada a Wompi como `reference` (= ticket.id). Se usa para conciliar el webhook. */
  paymentRef?: string;
  paymentStatus: PaymentStatus;
  /** Si ya se envió el link de WhatsApp con el QR. */
  whatsappSent: boolean;
  status: TicketStatus;
  presence: Presence;
  entryCount: number;
  scans: GateScan[];
  checkedInAt?: string;
  lastScanAt?: string;
}

export interface Event {
  id: string;
  name: string;
  /** Slug para la URL pública, ej: "love-house-15-ago". */
  slug: string;
  /** Fecha y hora del evento, ISO 8601. */
  date: string;
  venue: string;
  coverImageUrl?: string;
  stages: PriceStage[];
  status: EventStatus;
  tickets: Ticket[];
}

export interface PublicEvent {
  id: string;
  name: string;
  slug: string;
  date: string;
  venue: string;
  coverImageUrl?: string;
  status: EventStatus;
  currentStage: PriceStage | null;
  /** Precio que paga el comprador en la etapa vigente (incluye comisión Wompi). */
  publicPrice: number;
  /** Cupo total restante en el evento (suma de todas las etapas). */
  remaining: number;
  inside: number;
  outside: number;
  entries: number;
}

export interface BoxOfficeStats {
  sold: number;
  remaining: number;
  inside: number;
  outside: number;
  neverEntered: number;
  voided: number;
  entries: number;
  scans: number;
  checkedIn: number;
  pendingEntry: number;
  /** Suma de `pricePaid` de los tickets con pago aprobado. */
  revenue: number;
}

export function totalCapacity(event: Event): number {
  return event.stages.reduce((sum, stage) => sum + stage.capacity, 0);
}

export function totalSold(event: Event): number {
  return event.stages.reduce((sum, stage) => sum + stage.soldCount, 0);
}

export function remainingSeats(event: Event): number {
  return Math.max(0, totalCapacity(event) - totalSold(event));
}

/** La primera etapa (en orden) que todavía tiene cupo disponible. */
export function currentStage(event: Event): PriceStage | null {
  return event.stages.find((stage) => stage.soldCount < stage.capacity) ?? null;
}

/** Precio que paga el comprador: el precio de Daniel absorbiendo la comisión de Wompi. */
export function publicPrice(event: Event): number {
  const stage = currentStage(event);
  if (!stage) return 0;
  return Math.ceil(stage.price / (1 - WOMPI_FEE_RATE));
}

export function occupancy(event: Event): {
  inside: number;
  outside: number;
  entries: number;
} {
  const live = event.tickets.filter((ticket) => ticket.status !== "voided");
  return {
    inside: live.filter((ticket) => ticket.presence === "inside").length,
    outside: live.filter((ticket) => ticket.presence === "outside").length,
    entries: live.reduce((sum, ticket) => sum + ticket.entryCount, 0),
  };
}

export function toPublicEvent(event: Event): PublicEvent {
  const { inside, outside, entries } = occupancy(event);
  return {
    id: event.id,
    name: event.name,
    slug: event.slug,
    date: event.date,
    venue: event.venue,
    coverImageUrl: event.coverImageUrl,
    status: event.status,
    currentStage: currentStage(event),
    publicPrice: publicPrice(event),
    remaining: remainingSeats(event),
    inside,
    outside,
    entries,
  };
}

export function boxOfficeStats(event: Event): BoxOfficeStats {
  const live = event.tickets.filter((ticket) => ticket.status !== "voided");
  const inside = live.filter((ticket) => ticket.presence === "inside").length;
  const neverEntered = live.filter((ticket) => ticket.entryCount === 0).length;
  const approved = event.tickets.filter((ticket) => ticket.paymentStatus === "approved");
  return {
    sold: totalSold(event),
    remaining: remainingSeats(event),
    inside,
    outside: live.filter((ticket) => ticket.presence === "outside").length,
    neverEntered,
    voided: event.tickets.filter((ticket) => ticket.status === "voided").length,
    entries: live.reduce((sum, ticket) => sum + ticket.entryCount, 0),
    scans: event.tickets.reduce((sum, ticket) => sum + ticket.scans.length, 0),
    checkedIn: inside,
    pendingEntry: neverEntered,
    revenue: approved.reduce((sum, ticket) => sum + ticket.pricePaid, 0),
  };
}

export function recentScans(event: Event, limit = 20) {
  return event.tickets
    .flatMap((ticket) =>
      ticket.scans.map((scan) => ({
        ...scan,
        ticketId: ticket.id,
        attendeeName: ticket.attendeeName,
        code: ticket.code,
      })),
    )
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}

export function normalizePhone(raw: string | number | null | undefined): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("3")) {
    return digits;
  }
  if (digits.length === 12 && digits.startsWith("57") && digits[2] === "3") {
    return digits.slice(2);
  }
  throw new Error("Usa un celular colombiano de 10 dígitos (3XX...).");
}

export function slugify(raw: string): string {
  const slug = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) {
    throw new Error("No se pudo generar un slug válido.");
  }
  return slug;
}

export interface CreateEventStageInput {
  name: string;
  price: number;
  capacity: number;
}

export function createEvent(input: {
  name: string;
  slug?: string;
  date: string | Date;
  venue?: string;
  coverImageUrl?: string;
  stages: CreateEventStageInput[];
}): Event {
  if (!input.name?.trim()) {
    throw new Error("El nombre del evento es obligatorio.");
  }
  if (!Array.isArray(input.stages) || input.stages.length === 0) {
    throw new Error("El evento necesita al menos una etapa de precio.");
  }

  const stages: PriceStage[] = input.stages.map((stage) => {
    const price = Number(stage.price);
    const capacity = Number(stage.capacity);
    if (!stage.name?.trim()) {
      throw new Error("Cada etapa necesita un nombre.");
    }
    if (!Number.isFinite(price) || price < 0) {
      throw new Error(`El precio de la etapa "${stage.name}" no es válido.`);
    }
    if (!Number.isFinite(capacity) || capacity < 1) {
      throw new Error(`El cupo de la etapa "${stage.name}" debe ser mayor a 0.`);
    }
    return {
      name: stage.name.trim(),
      price: Math.round(price),
      capacity: Math.floor(capacity),
      soldCount: 0,
    };
  });

  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    slug: slugify(input.slug?.trim() || input.name),
    date: toIso(input.date),
    venue: input.venue?.trim() || "Fama MZL",
    coverImageUrl: input.coverImageUrl?.trim() || undefined,
    stages,
    status: "published",
    tickets: [],
  };
}

export type IssueTicketResult =
  | { ok: true; event: Event; ticket: Ticket }
  | { ok: false; reason: "sold-out" | "cancelled" };

export function issueTicket(
  event: Event,
  attendeeName: string,
  phone: string,
): IssueTicketResult {
  const name = attendeeName?.trim();
  if (!name) {
    throw new Error("El nombre del asistente es obligatorio.");
  }
  const normalizedPhone = normalizePhone(phone);
  if (event.status === "cancelled") {
    return { ok: false, reason: "cancelled" };
  }

  const stage = currentStage(event);
  if (!stage) {
    return { ok: false, reason: "sold-out" };
  }

  const now = new Date().toISOString();
  const ticketId = crypto.randomUUID();
  const ticket: Ticket = {
    id: ticketId,
    code: makeTicketCode(),
    attendeeName: name,
    phone: normalizedPhone,
    createdAt: now,
    stage: stage.name,
    pricePaid: stage.price,
    publicPrice: publicPrice(event),
    paymentRef: ticketId,
    paymentStatus: "pending",
    whatsappSent: false,
    status: "issued",
    presence: "outside",
    entryCount: 0,
    scans: [],
  };

  const nextStages = event.stages.map((item) =>
    item.name === stage.name ? { ...item, soldCount: item.soldCount + 1 } : item,
  );
  const next: Event = {
    ...event,
    stages: nextStages,
    tickets: [...event.tickets, ticket],
  };
  next.status = remainingSeats(next) <= 0 ? "sold-out" : next.status;

  return { ok: true, event: next, ticket };
}

export type ConfirmPaymentResult =
  | { ok: true; event: Event; ticket: Ticket }
  | { ok: false; reason: "not-found" | "already-processed" };

/** Se llama desde el webhook de Wompi cuando la transacción queda APPROVED. */
export function confirmPayment(
  event: Event,
  ticketId: string,
  wompiTransactionId?: string,
): ConfirmPaymentResult {
  const ticket = event.tickets.find((item) => item.id === ticketId);
  if (!ticket) {
    return { ok: false, reason: "not-found" };
  }
  if (ticket.paymentStatus !== "pending") {
    return { ok: false, reason: "already-processed" };
  }
  const updated: Ticket = {
    ...ticket,
    paymentStatus: "approved",
    paymentRef: wompiTransactionId ?? ticket.paymentRef,
  };
  return { ok: true, event: replaceTicket(event, updated), ticket: updated };
}

export type RejectPaymentResult =
  | { ok: true; event: Event; ticket: Ticket }
  | { ok: false; reason: "not-found" | "already-processed" };

/** Se llama cuando Wompi reporta la transacción como DECLINED/ERROR: libera el cupo de la etapa. */
export function rejectPayment(event: Event, ticketId: string): RejectPaymentResult {
  const ticket = event.tickets.find((item) => item.id === ticketId);
  if (!ticket) {
    return { ok: false, reason: "not-found" };
  }
  if (ticket.paymentStatus !== "pending") {
    return { ok: false, reason: "already-processed" };
  }

  const updated: Ticket = { ...ticket, paymentStatus: "rejected", status: "voided" };
  const nextStages = event.stages.map((item) =>
    item.name === ticket.stage ? { ...item, soldCount: Math.max(0, item.soldCount - 1) } : item,
  );
  const withTicket = replaceTicket({ ...event, stages: nextStages }, updated);
  const nextStatus: EventStatus =
    event.status === "cancelled"
      ? "cancelled"
      : remainingSeats(withTicket) > 0
        ? "published"
        : "sold-out";

  return { ok: true, event: { ...withTicket, status: nextStatus }, ticket: updated };
}

export type ScanTicketResult =
  | {
      ok: true;
      outcome: "admitted" | "exited";
      event: Event;
      ticket: Ticket;
      scan: GateScan;
    }
  | {
      ok: false;
      reason: "not-found" | "voided" | "not-approved";
      event?: Event;
      ticket?: Ticket;
      scan?: GateScan;
    };

export function scanTicket(
  event: Event,
  code: string | number | null | undefined,
  gateRaw?: string | number | null,
): ScanTicketResult {
  const ticket = findTicket(event, code);
  if (!ticket) {
    return { ok: false, reason: "not-found" };
  }

  const gate = String(gateRaw ?? "puerta").trim() || "puerta";
  const at = new Date().toISOString();

  if (ticket.status === "voided") {
    const scan: GateScan = { at, gate, result: "rejected-voided" };
    const updated: Ticket = {
      ...ticket,
      lastScanAt: at,
      scans: [...ticket.scans, scan],
    };
    return {
      ok: false,
      reason: "voided",
      event: replaceTicket(event, updated),
      ticket: updated,
      scan,
    };
  }

  if (ticket.paymentStatus !== "approved") {
    const scan: GateScan = { at, gate, result: "rejected-voided" };
    const updated: Ticket = {
      ...ticket,
      lastScanAt: at,
      scans: [...ticket.scans, scan],
    };
    return {
      ok: false,
      reason: "not-approved",
      event: replaceTicket(event, updated),
      ticket: updated,
      scan,
    };
  }

  if (ticket.presence === "outside") {
    const scan: GateScan = { at, gate, result: "admitted" };
    const updated: Ticket = {
      ...ticket,
      status: "checked-in",
      presence: "inside",
      entryCount: ticket.entryCount + 1,
      checkedInAt: ticket.checkedInAt ?? at,
      lastScanAt: at,
      scans: [...ticket.scans, scan],
    };
    return {
      ok: true,
      outcome: "admitted",
      ticket: updated,
      scan,
      event: replaceTicket(event, updated),
    };
  }

  const scan: GateScan = { at, gate, result: "exited" };
  const updated: Ticket = {
    ...ticket,
    presence: "outside",
    lastScanAt: at,
    scans: [...ticket.scans, scan],
  };
  return {
    ok: true,
    outcome: "exited",
    ticket: updated,
    scan,
    event: replaceTicket(event, updated),
  };
}

export function checkInTicket(
  event: Event,
  code: string | number | null | undefined,
  gate?: string,
): ScanTicketResult {
  return scanTicket(event, code, gate);
}

export type VoidResult =
  | { ok: true; event: Event; ticket: Ticket }
  | { ok: false; reason: "not-found" | "already-checked-in" };

export function voidTicket(event: Event, ticketId: string): VoidResult {
  const ticket = event.tickets.find((item) => item.id === ticketId);
  if (!ticket) {
    return { ok: false, reason: "not-found" };
  }
  if (ticket.presence === "inside" || ticket.status === "checked-in") {
    return { ok: false, reason: "already-checked-in" };
  }
  if (ticket.status === "voided") {
    return { ok: true, event, ticket };
  }

  const updated: Ticket = { ...ticket, status: "voided" };
  const nextStages = event.stages.map((item) =>
    item.name === ticket.stage ? { ...item, soldCount: Math.max(0, item.soldCount - 1) } : item,
  );
  const withTicket = replaceTicket({ ...event, stages: nextStages }, updated);
  const nextStatus: EventStatus =
    event.status === "cancelled"
      ? "cancelled"
      : remainingSeats(withTicket) > 0
        ? "published"
        : "sold-out";

  return { ok: true, event: { ...withTicket, status: nextStatus }, ticket: updated };
}

export function findTicket(
  event: Event,
  code: string | number | null | undefined,
): Ticket | undefined {
  const upper = String(code ?? "").trim().toUpperCase();
  return event.tickets.find((ticket) => ticket.code === upper);
}

function replaceTicket(event: Event, ticket: Ticket): Event {
  return {
    ...event,
    tickets: event.tickets.map((item) => (item.id === ticket.id ? ticket : item)),
  };
}

function makeTicketCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let body = "";
  for (let i = 0; i < 8; i++) {
    body += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `TQT-${body}`;
}

function toIso(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("La fecha del evento no es válida.");
  }
  return parsed.toISOString();
}
