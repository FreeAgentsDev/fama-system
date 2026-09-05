"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { adminErrorMessage } from "@/lib/admin-errors";
import type { AdminTicket, BoxOfficeSnapshot } from "@/lib/admin-types";
import { useAdminStream, type DomainStreamEvent } from "@/lib/use-admin-stream";

const currency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const timeFormatter = new Intl.DateTimeFormat("es-CO", { timeStyle: "medium" });

interface FeedItem {
  id: string;
  at: string;
  message: string;
  tone: "good" | "bad" | "neutral";
}

/** Nombres de domain events que traen `{ event: { id } , ... }` y afectan a este evento. */
const RELEVANT_EVENT_NAMES = new Set([
  "TicketAdmittedDomainEvent",
  "TicketExitedDomainEvent",
  "TicketVoidedDomainEvent",
  "TicketPaymentConfirmedDomainEvent",
  "TicketPaymentRejectedDomainEvent",
  "CourtesyTicketIssuedDomainEvent",
  "EventSoldOutDomainEvent",
]);

function describe(name: string, payload: Record<string, unknown>): FeedItem | null {
  const ticket = payload.ticket as { attendeeName?: string } | undefined;
  const attendee = ticket?.attendeeName ?? "alguien";
  switch (name) {
    case "TicketAdmittedDomainEvent":
      return { id: crypto.randomUUID(), at: new Date().toISOString(), tone: "good", message: `✅ ${attendee} entró` };
    case "TicketExitedDomainEvent":
      return { id: crypto.randomUUID(), at: new Date().toISOString(), tone: "neutral", message: `↩️ ${attendee} salió` };
    case "TicketVoidedDomainEvent":
      return { id: crypto.randomUUID(), at: new Date().toISOString(), tone: "bad", message: `❌ boleta de ${attendee} anulada` };
    case "TicketPaymentConfirmedDomainEvent":
      return { id: crypto.randomUUID(), at: new Date().toISOString(), tone: "good", message: `💳 ${attendee} pagó su boleta` };
    case "TicketPaymentRejectedDomainEvent":
      return { id: crypto.randomUUID(), at: new Date().toISOString(), tone: "bad", message: `💳 pago rechazado de ${attendee}` };
    case "CourtesyTicketIssuedDomainEvent":
      return { id: crypto.randomUUID(), at: new Date().toISOString(), tone: "neutral", message: `🎁 cortesía para ${attendee}` };
    case "EventSoldOutDomainEvent":
      return { id: crypto.randomUUID(), at: new Date().toISOString(), tone: "bad", message: "🔥 ¡Este evento se agotó!" };
    default:
      return null;
  }
}

type PresenceFilter = "todos" | "adentro" | "afuera" | "nunca" | "anuladas";

const FILTER_LABELS: Record<PresenceFilter, string> = {
  todos: "Todos",
  adentro: "Adentro",
  afuera: "Afuera",
  nunca: "Sin entrar",
  anuladas: "Anuladas",
};

function matchesFilter(ticket: AdminTicket, filter: PresenceFilter): boolean {
  const voided = ticket.status === "voided";
  switch (filter) {
    case "adentro":
      return !voided && ticket.presence === "inside";
    // "Afuera" es quien ya entró y volvió a salir. Quien nunca entró tiene su propio filtro:
    // en la puerta no es lo mismo buscar a alguien que salió a fumar que a alguien que no llegó.
    case "afuera":
      return !voided && ticket.presence === "outside" && ticket.entryCount > 0;
    case "nunca":
      return !voided && ticket.entryCount === 0;
    case "anuladas":
      return voided;
    default:
      return true;
  }
}

function scanLabel(result: AdminTicket["scans"][number]["result"]): string {
  if (result === "admitted") return "Entró";
  if (result === "exited") return "Salió";
  return "Rechazado";
}

function estadoBadge(ticket: AdminTicket): { icon: string; label: string; className: string } {
  if (ticket.status === "voided") {
    return { icon: "✕", label: "Anulada", className: "text-[#ff8a8a]" };
  }
  if (ticket.paymentStatus === "pending") {
    return { icon: "·", label: "Pago pendiente", className: "text-white/40" };
  }
  if (ticket.presence === "inside") {
    return { icon: "●", label: "Adentro", className: "text-emerald-300" };
  }
  // En la puerta no es lo mismo alguien que salió a fumar que alguien que todavía no llega:
  // el primero ya está contado como asistente, el segundo puede que nunca aparezca.
  if (ticket.entryCount === 0) {
    return { icon: "○", label: "Sin entrar", className: "text-white/45" };
  }
  return { icon: "○", label: "Afuera", className: "text-white/70" };
}

function toCsv(tickets: AdminTicket[]): string {
  const header = [
    "nombre",
    "telefono",
    "etapa",
    "precio_pagado",
    "estado",
    "entradas",
    "ultimo_movimiento",
    "pago",
    "codigo",
  ];
  const rows = tickets.map((ticket) => {
    const estado = estadoBadge(ticket);
    return [
      ticket.attendeeName,
      ticket.phone,
      ticket.stage,
      String(ticket.pricePaid),
      estado.label,
      String(ticket.entryCount),
      ticket.lastScanAt ?? "",
      ticket.paymentStatus,
      ticket.code,
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(",");
  });
  return [header.join(","), ...rows].join("\n");
}

export function EventDetail({ initialSnapshot }: { initialSnapshot: BoxOfficeSnapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [busyTicketId, setBusyTicketId] = useState<string | null>(null);
  const [courtesyOpen, setCourtesyOpen] = useState(false);
  const [courtesyName, setCourtesyName] = useState("");
  const [courtesyPhone, setCourtesyPhone] = useState("");
  const [courtesyError, setCourtesyError] = useState<string | null>(null);
  const [courtesyLoading, setCourtesyLoading] = useState(false);
  const [filter, setFilter] = useState<PresenceFilter>("todos");
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [presenceError, setPresenceError] = useState<string | null>(null);

  const eventId = snapshot.event.id;

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/admin/events/${eventId}`, { cache: "no-store" });
    if (res.ok) {
      setSnapshot(await res.json());
    }
  }, [eventId]);

  const handleStreamEvent = useCallback(
    (streamEvent: DomainStreamEvent) => {
      if (!RELEVANT_EVENT_NAMES.has(streamEvent.name)) return;
      const payload = streamEvent.payload as Record<string, unknown>;
      const payloadEvent = payload.event as { id?: string } | undefined;
      if (payloadEvent?.id && payloadEvent.id !== eventId) return;

      const item = describe(streamEvent.name, payload);
      if (item) {
        setFeed((prev) => [item, ...prev].slice(0, 10));
      }
      void refresh();
    },
    [eventId, refresh],
  );

  useAdminStream(handleStreamEvent);

  const allTickets = useMemo(
    () => [...snapshot.event.tickets].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [snapshot.event.tickets],
  );

  const tickets = useMemo(
    () => allTickets.filter((ticket) => matchesFilter(ticket, filter)),
    [allTickets, filter],
  );

  const counts = useMemo(() => {
    const entries = Object.keys(FILTER_LABELS) as PresenceFilter[];
    return Object.fromEntries(
      entries.map((key) => [key, allTickets.filter((t) => matchesFilter(t, key)).length]),
    ) as Record<PresenceFilter, number>;
  }, [allTickets]);

  async function handleVoid(ticketId: string) {
    setBusyTicketId(ticketId);
    try {
      await fetch(`/api/admin/events/${eventId}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId }),
      });
      await refresh();
    } finally {
      setBusyTicketId(null);
    }
  }

  /**
   * Marca entrada o salida a mano. Va por el mismo scan-ticket que la puerta, así que el
   * movimiento queda registrado con hora y origen "admin" en vez de aparecer de la nada.
   */
  async function handlePresence(ticket: AdminTicket) {
    setBusyTicketId(ticket.id);
    setPresenceError(null);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: ticket.code }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setPresenceError(adminErrorMessage(body, "No se pudo marcar el movimiento."));
        return;
      }
      await refresh();
    } finally {
      setBusyTicketId(null);
    }
  }

  async function handleCourtesySubmit(event: React.FormEvent) {
    event.preventDefault();
    setCourtesyError(null);
    if (!courtesyName.trim() || !courtesyPhone.trim()) {
      setCourtesyError("Completa nombre y teléfono.");
      return;
    }
    setCourtesyLoading(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/courtesy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendeeName: courtesyName, phone: courtesyPhone }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setCourtesyError(body.error === "EventSoldOutDomainEvent" ? "El evento está agotado." : "No se pudo crear la cortesía.");
        return;
      }
      setCourtesyName("");
      setCourtesyPhone("");
      setCourtesyOpen(false);
      await refresh();
    } finally {
      setCourtesyLoading(false);
    }
  }

  function handleExportCsv() {
    const blob = new Blob([toCsv(snapshot.event.tickets)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${snapshot.event.slug}-compradores.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <p className="fama-kicker">{snapshot.event.venue}</p>
      <div className="mt-2 mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{snapshot.event.name}</h1>
        <Link href={`/admin/eventos/${eventId}/editar`} className="fama-btn-ghost text-xs">
          Editar evento
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              Compradores ({tickets.length}
              {filter !== "todos" ? ` de ${allTickets.length}` : ""})
            </h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => setCourtesyOpen((prev) => !prev)} className="fama-btn-ghost text-xs">
                + Cortesía
              </button>
              <button type="button" onClick={handleExportCsv} className="fama-btn-ghost text-xs">
                Exportar CSV
              </button>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {(Object.keys(FILTER_LABELS) as PresenceFilter[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={
                  filter === key
                    ? "rounded-full bg-[#e8b84a] px-3 py-1.5 text-xs font-semibold text-black"
                    : "rounded-full bg-white/5 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10"
                }
              >
                {FILTER_LABELS[key]} ({counts[key]})
              </button>
            ))}
          </div>

          {presenceError && <p className="mb-3 text-sm text-[#ff8a8a]">{presenceError}</p>}

          {courtesyOpen && (
            <form onSubmit={handleCourtesySubmit} className="fama-card mb-4 flex flex-wrap items-end gap-3 p-4">
              <div className="min-w-[160px] flex-1">
                <label className="mb-1 block text-xs text-white/40">Nombre</label>
                <input
                  value={courtesyName}
                  onChange={(event) => setCourtesyName(event.target.value)}
                  className="fama-input py-2.5"
                />
              </div>
              <div className="min-w-[140px] flex-1">
                <label className="mb-1 block text-xs text-white/40">WhatsApp</label>
                <input
                  value={courtesyPhone}
                  onChange={(event) => setCourtesyPhone(event.target.value)}
                  className="fama-input py-2.5"
                />
              </div>
              <button type="submit" disabled={courtesyLoading} className="fama-btn py-2.5 text-sm">
                {courtesyLoading ? "Creando…" : "Crear cortesía"}
              </button>
              {courtesyError && <p className="w-full text-xs text-[#ff8a8a]">{courtesyError}</p>}
            </form>
          )}

          <div className="fama-card overflow-x-auto">
            <table className="fama-table min-w-[640px]">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Etapa</th>
                  <th>Precio</th>
                  <th>Estado</th>
                  <th>Movs.</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => {
                  const estado = estadoBadge(ticket);
                  const canVoid = ticket.status !== "voided" && ticket.entryCount === 0;
                  const activo = ticket.status !== "voided" && ticket.paymentStatus === "approved";
                  const expanded = expandedTicketId === ticket.id;
                  return [
                    <tr key={ticket.id}>
                      <td>{ticket.attendeeName}</td>
                      <td className="text-white/50">{ticket.phone}</td>
                      <td className="text-white/50">{ticket.stage}</td>
                      <td className="text-white/50">{currency.format(ticket.pricePaid)}</td>
                      <td className={estado.className}>
                        {estado.icon} {estado.label}
                      </td>
                      <td>
                        {ticket.scans.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setExpandedTicketId(expanded ? null : ticket.id)}
                            className="text-xs text-white/60 hover:text-white hover:underline"
                          >
                            {ticket.scans.length} {expanded ? "▾" : "▸"}
                          </button>
                        ) : (
                          <span className="text-xs text-white/25">—</span>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-3">
                          {activo && (
                            <button
                              type="button"
                              onClick={() => handlePresence(ticket)}
                              disabled={busyTicketId === ticket.id}
                              className="text-xs text-[#4db8ff] hover:underline disabled:opacity-50"
                            >
                              {ticket.presence === "inside" ? "Marcar salida" : "Marcar entrada"}
                            </button>
                          )}
                          {canVoid && (
                            <button
                              type="button"
                              onClick={() => handleVoid(ticket.id)}
                              disabled={busyTicketId === ticket.id}
                              className="text-xs text-[#ff8a8a] hover:underline disabled:opacity-50"
                            >
                              Anular
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>,
                    expanded ? (
                      <tr key={`${ticket.id}-movs`}>
                        <td colSpan={7} className="bg-white/[0.03]">
                          <div className="px-2 py-3">
                            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-white/35">
                              Movimientos de {ticket.attendeeName} · {ticket.code}
                            </p>
                            <ol className="space-y-1.5">
                              {[...ticket.scans]
                                .sort((a, b) => b.at.localeCompare(a.at))
                                .map((scan, index) => (
                                  <li
                                    key={`${scan.at}-${index}`}
                                    className="flex items-center gap-3 text-sm"
                                  >
                                    <span
                                      className={
                                        scan.result === "admitted"
                                          ? "text-emerald-300"
                                          : scan.result === "exited"
                                            ? "text-[#e8b84a]"
                                            : "text-[#ff8a8a]"
                                      }
                                    >
                                      {scan.result === "admitted" ? "→" : scan.result === "exited" ? "←" : "✕"}{" "}
                                      {scanLabel(scan.result)}
                                    </span>
                                    <span className="text-white/45">
                                      {timeFormatter.format(new Date(scan.at))}
                                    </span>
                                    <span className="text-xs text-white/30">
                                      {scan.gate === "admin" ? "a mano desde el admin" : `puerta: ${scan.gate}`}
                                    </span>
                                  </li>
                                ))}
                            </ol>
                          </div>
                        </td>
                      </tr>
                    ) : null,
                  ];
                })}
                {tickets.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-white/40">
                      {allTickets.length === 0
                        ? "Todavía no hay compradores."
                        : "Nadie en este filtro."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="fama-card p-5 text-center">
            <div className="flex justify-around">
              <div>
                <div className="text-5xl font-semibold text-emerald-300 [text-shadow:0_0_24px_rgba(52,211,153,0.45)]">
                  {snapshot.stats.inside}
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/40">Adentro</div>
              </div>
              <div>
                <div className="text-5xl font-semibold text-white/80">{snapshot.stats.outside}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/40">Afuera</div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 text-xs text-white/45">
              <span>Vendidas: {snapshot.stats.sold}</span>
              <span>Recaudo: {currency.format(snapshot.stats.revenue)}</span>
              <span>Anuladas: {snapshot.stats.voided}</span>
              <span>Restantes: {snapshot.stats.remaining}</span>
            </div>
          </div>

          <div className="fama-card p-5">
            <h3 className="fama-kicker mb-3">En vivo</h3>
            <ul className="space-y-2 text-sm">
              {feed.length === 0 && <li className="text-white/35">Esperando movimiento…</li>}
              {feed.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2">
                  <span
                    className={
                      item.tone === "good"
                        ? "text-emerald-300"
                        : item.tone === "bad"
                          ? "text-[#ff8a8a]"
                          : "text-white/80"
                    }
                  >
                    {item.message}
                  </span>
                  <span className="shrink-0 text-xs text-white/30">{timeFormatter.format(new Date(item.at))}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
