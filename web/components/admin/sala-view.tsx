"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminEventSummary, BoxOfficeSnapshot } from "@/lib/admin-types";
import { useAdminStream, type DomainStreamEvent } from "@/lib/use-admin-stream";

interface FeedItem {
  id: string;
  message: string;
}

const RELEVANT_EVENT_NAMES = new Set([
  "TicketAdmittedDomainEvent",
  "TicketExitedDomainEvent",
  "TicketVoidedDomainEvent",
  "TicketPaymentConfirmedDomainEvent",
  "CourtesyTicketIssuedDomainEvent",
]);

function describe(name: string, payload: Record<string, unknown>): string | null {
  const ticket = payload.ticket as { attendeeName?: string } | undefined;
  const attendee = ticket?.attendeeName ?? "alguien";
  switch (name) {
    case "TicketAdmittedDomainEvent":
      return `✅ ${attendee} entró`;
    case "TicketExitedDomainEvent":
      return `↩️ ${attendee} salió`;
    case "TicketVoidedDomainEvent":
      return `❌ boleta de ${attendee} anulada`;
    case "TicketPaymentConfirmedDomainEvent":
      return `💳 ${attendee} pagó`;
    case "CourtesyTicketIssuedDomainEvent":
      return `🎁 cortesía para ${attendee}`;
    default:
      return null;
  }
}

export function SalaView({ events }: { events: AdminEventSummary[] }) {
  const sorted = useMemo(
    () => [...events].sort((a, b) => a.date.localeCompare(b.date)),
    [events],
  );
  const [eventId, setEventId] = useState(sorted[0]?.id ?? "");

  if (sorted.length === 0) {
    return <p className="text-neutral-400">No hay eventos activos.</p>;
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <select
        value={eventId}
        onChange={(event) => setEventId(event.target.value)}
        className="w-full max-w-xs rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
      >
        {sorted.map((event) => (
          <option key={event.id} value={event.id}>
            {event.name}
          </option>
        ))}
      </select>

      {/* `key` fuerza a remontar (y así resetear snapshot/feed) cada vez que cambia el evento. */}
      <SalaLive key={eventId} eventId={eventId} />
    </div>
  );
}

function SalaLive({ eventId }: { eventId: string }) {
  const [snapshot, setSnapshot] = useState<BoxOfficeSnapshot | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/admin/events/${eventId}`, { cache: "no-store" });
    if (res.ok) {
      setSnapshot(await res.json());
    }
  }, [eventId]);

  useEffect(() => {
    // Carga inicial del snapshot al montar (se remonta por completo vía `key={eventId}`
    // en el padre, así que esto solo corre una vez por evento seleccionado).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const handleStreamEvent = useCallback(
    (streamEvent: DomainStreamEvent) => {
      if (!RELEVANT_EVENT_NAMES.has(streamEvent.name)) return;
      const payload = streamEvent.payload as Record<string, unknown>;
      const payloadEvent = payload.event as { id?: string } | undefined;
      if (!payloadEvent?.id || payloadEvent.id !== eventId) return;

      const message = describe(streamEvent.name, payload);
      if (message) {
        setFeed((prev) => [{ id: crypto.randomUUID(), message }, ...prev].slice(0, 5));
      }
      void refresh();
    },
    [eventId, refresh],
  );

  useAdminStream(handleStreamEvent);

  return (
    <>
      <div>
        <div className="text-8xl font-black text-green-400">{snapshot?.stats.inside ?? "—"}</div>
        <div className="mt-1 text-lg text-neutral-400">personas adentro</div>
      </div>

      <div className="w-full max-w-sm space-y-2 text-left">
        {feed.length === 0 && <p className="text-center text-neutral-600">Esperando movimiento…</p>}
        {feed.map((item) => (
          <div
            key={item.id}
            className="rounded border border-neutral-800 bg-neutral-950 px-4 py-3 text-lg"
          >
            {item.message}
          </div>
        ))}
      </div>
    </>
  );
}
