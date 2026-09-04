"use client";

import { useCallback, useMemo, useState } from "react";
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
  return { icon: "○", label: "Afuera", className: "text-white/70" };
}

function toCsv(tickets: AdminTicket[]): string {
  const header = ["nombre", "telefono", "etapa", "precio_pagado", "estado", "pago", "codigo"];
  const rows = tickets.map((ticket) => {
    const estado = estadoBadge(ticket);
    return [
      ticket.attendeeName,
      ticket.phone,
      ticket.stage,
      String(ticket.pricePaid),
      estado.label,
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

  const tickets = useMemo(
    () => [...snapshot.event.tickets].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [snapshot.event.tickets],
  );

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
      <h1 className="mt-2 mb-8 text-3xl font-semibold tracking-tight">{snapshot.event.name}</h1>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Compradores ({tickets.length})</h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => setCourtesyOpen((prev) => !prev)} className="fama-btn-ghost text-xs">
                + Cortesía
              </button>
              <button type="button" onClick={handleExportCsv} className="fama-btn-ghost text-xs">
                Exportar CSV
              </button>
            </div>
          </div>

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
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => {
                  const estado = estadoBadge(ticket);
                  const canVoid = ticket.status !== "voided" && ticket.entryCount === 0;
                  return (
                    <tr key={ticket.id}>
                      <td>{ticket.attendeeName}</td>
                      <td className="text-white/50">{ticket.phone}</td>
                      <td className="text-white/50">{ticket.stage}</td>
                      <td className="text-white/50">{currency.format(ticket.pricePaid)}</td>
                      <td className={estado.className}>
                        {estado.icon} {estado.label}
                      </td>
                      <td className="text-right">
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
                      </td>
                    </tr>
                  );
                })}
                {tickets.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-white/40">
                      Todavía no hay compradores.
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
