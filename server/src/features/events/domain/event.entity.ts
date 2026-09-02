export type EventStatus = "published" | "sold-out" | "cancelled";
export type TicketStatus = "issued" | "checked-in" | "voided";
export type Presence = "outside" | "inside";
export type ScanResult = "admitted" | "exited" | "rejected-voided";

export interface GateScan {
  at: string;
  gate: string;
  result: ScanResult;
}

export interface Ticket {
  id: string;
  code: string;
  attendeeName: string;
  phone: string;
  createdAt: string;
  status: TicketStatus;
  presence: Presence;
  entryCount: number;
  scans: GateScan[];
  smsCode: string;
  smsSentAt: string;
  smsCount: number;
  checkedInAt?: string;
  lastScanAt?: string;
}

export interface Event {
  id: string;
  title: string;
  startsAt: string;
  capacity: number;
  reservedCount: number;
  status: EventStatus;
  tickets: Ticket[];
}

export interface PublicEvent {
  id: string;
  title: string;
  startsAt: string;
  capacity: number;
  reservedCount: number;
  status: EventStatus;
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
}

export function remainingSeats(event: Event): number {
  return Math.max(0, event.capacity - event.reservedCount);
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
    title: event.title,
    startsAt: event.startsAt,
    capacity: event.capacity,
    reservedCount: event.reservedCount,
    status: event.status,
    inside,
    outside,
    entries,
  };
}

export function boxOfficeStats(event: Event): BoxOfficeStats {
  const live = event.tickets.filter((ticket) => ticket.status !== "voided");
  const inside = live.filter((ticket) => ticket.presence === "inside").length;
  const neverEntered = live.filter((ticket) => ticket.entryCount === 0).length;
  return {
    sold: event.reservedCount,
    remaining: remainingSeats(event),
    inside,
    outside: live.filter((ticket) => ticket.presence === "outside").length,
    neverEntered,
    voided: event.tickets.filter((ticket) => ticket.status === "voided").length,
    entries: live.reduce((sum, ticket) => sum + ticket.entryCount, 0),
    scans: event.tickets.reduce((sum, ticket) => sum + ticket.scans.length, 0),
    checkedIn: inside,
    pendingEntry: neverEntered,
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

export function createEvent(input: {
  title: string;
  startsAt: string | Date;
  capacity: number;
}): Event {
  const capacity = Number(input.capacity);
  if (!input.title?.trim()) {
    throw new Error("El título es obligatorio.");
  }
  if (!Number.isFinite(capacity) || capacity < 1) {
    throw new Error("El cupo debe ser un entero mayor a 0.");
  }

  return {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    startsAt: toIso(input.startsAt),
    capacity: Math.floor(capacity),
    reservedCount: 0,
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
  if (event.status === "sold-out" || remainingSeats(event) <= 0) {
    return { ok: false, reason: "sold-out" };
  }

  const now = new Date().toISOString();
  const ticket: Ticket = {
    id: crypto.randomUUID(),
    code: makeTicketCode(),
    attendeeName: name,
    phone: normalizedPhone,
    createdAt: now,
    status: "issued",
    presence: "outside",
    entryCount: 0,
    scans: [],
    smsCode: makeSmsCode(),
    smsSentAt: now,
    smsCount: 1,
  };

  const reservedCount = event.reservedCount + 1;
  const next: Event = {
    ...event,
    reservedCount,
    status: reservedCount >= event.capacity ? "sold-out" : "published",
    tickets: [...event.tickets, ticket],
  };

  return { ok: true, event: next, ticket };
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
      reason: "not-found" | "voided";
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
  const reservedCount = Math.max(0, event.reservedCount - 1);
  const next: Event = {
    ...replaceTicket(event, updated),
    reservedCount,
    status:
      event.status === "cancelled"
        ? "cancelled"
        : reservedCount >= event.capacity
          ? "sold-out"
          : "published",
  };
  return { ok: true, event: next, ticket: updated };
}

export function refreshTicketSms(event: Event, ticketId: string): Event | null {
  const ticket = event.tickets.find((item) => item.id === ticketId);
  if (!ticket || ticket.status === "voided") {
    return null;
  }
  const updated: Ticket = {
    ...ticket,
    smsCode: makeSmsCode(),
    smsSentAt: new Date().toISOString(),
    smsCount: ticket.smsCount + 1,
  };
  return replaceTicket(event, updated);
}

export function ticketSmsBody(event: Event, ticket: Ticket): string {
  return `Tiquetera: tu código de entrada a "${event.title}" es ${ticket.smsCode}. QR: ${ticket.code}`;
}

export function findTicket(
  event: Event,
  code: string | number | null | undefined,
): Ticket | undefined {
  const raw = String(code ?? "").trim();
  const upper = raw.toUpperCase();
  return event.tickets.find(
    (ticket) => ticket.code === upper || ticket.smsCode === raw,
  );
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

function makeSmsCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
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
