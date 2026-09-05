"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import type { AdminEventSummary } from "@/lib/admin-types";
import { useAdminStream, type DomainStreamEvent } from "@/lib/use-admin-stream";

const currency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

/** Ventana en la que una noche cuenta como "en curso": desde 3h antes hasta 8h después. */
const STARTS_BEFORE_MS = 3 * 60 * 60 * 1000;
const ENDS_AFTER_MS = 8 * 60 * 60 * 1000;

type Phase = "en-curso" | "proxima" | "terminada";

const RELEVANT_EVENT_NAMES = new Set([
  "TicketAdmittedDomainEvent",
  "TicketExitedDomainEvent",
  "TicketVoidedDomainEvent",
  "TicketPaymentConfirmedDomainEvent",
  "CourtesyTicketIssuedDomainEvent",
  "EventSoldOutDomainEvent",
]);

function phaseOf(event: AdminEventSummary, now: number): Phase {
  const start = new Date(event.date).getTime();
  // Si hay gente adentro la noche está corriendo, sin importar lo que diga el reloj.
  if (event.inside > 0) return "en-curso";
  if (now > start + ENDS_AFTER_MS) return "terminada";
  if (now >= start - STARTS_BEFORE_MS) return "en-curso";
  return "proxima";
}

const PHASE_PILL: Record<Phase, { label: string; className: string }> = {
  "en-curso": { label: "En curso", className: "bg-emerald-400/15 text-emerald-300" },
  proxima: { label: "Próxima", className: "bg-[#4db8ff]/15 text-[#4db8ff]" },
  terminada: { label: "Terminada", className: "bg-white/8 text-white/45" },
};

function relativeTime(iso: string, now: number): string {
  const diff = now - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.round(hours / 24)} d`;
}

function Stat({ value, label, tone }: { value: string; label: string; tone?: string }) {
  return (
    <div>
      <div className={`text-2xl font-semibold ${tone ?? "text-white/85"}`}>{value}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-white/35">{label}</div>
    </div>
  );
}

/**
 * Ojo con `outside` del dominio: significa "no está adentro", así que incluye a quien nunca
 * llegó. Los que de verdad entraron y se fueron son `attended - inside`.
 */
function yaSeFueron(event: AdminEventSummary): number {
  return Math.max(event.attended - event.inside, 0);
}

function OccupancyBar({ event }: { event: AdminEventSummary }) {
  const vendidas = Math.max(event.sold, 1);
  const dentro = (event.inside / vendidas) * 100;
  const salieron = (yaSeFueron(event) / vendidas) * 100;
  return (
    <div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-white/8">
        <div className="bg-emerald-400" style={{ width: `${dentro}%` }} />
        <div className="bg-[#e8b84a]/70" style={{ width: `${salieron}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-white/35">
        <span>{event.attended} de {event.sold} vendidas ya entraron</span>
        <span>{event.neverEntered} sin llegar</span>
      </div>
    </div>
  );
}

function SalaCard({ event, now }: { event: AdminEventSummary; now: number }) {
  const phase = phaseOf(event, now);
  const pill = PHASE_PILL[phase];
  const terminada = phase === "terminada";
  const asistencia = event.sold > 0 ? Math.round((event.attended / event.sold) * 100) : 0;

  return (
    <div className="fama-card flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/admin/eventos/${event.id}`}
            className="block truncate text-lg font-semibold hover:text-[#4db8ff]"
          >
            {event.name}
          </Link>
          <p className="mt-0.5 truncate text-xs text-white/40">
            {event.venue} · {formatDateTime(event.date)}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${pill.className}`}>
          {pill.label}
        </span>
      </div>

      {terminada ? (
        // Una noche que ya pasó no tiene "adentro": lo que importa es cuántos de los que
        // compraron efectivamente fueron.
        <div className="grid grid-cols-3 gap-3">
          <Stat value={`${asistencia}%`} label="Asistencia" tone="text-[#e8b84a]" />
          <Stat value={String(event.attended)} label="Asistieron" />
          <Stat value={String(event.neverEntered)} label="No llegaron" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <Stat
            value={String(event.inside)}
            label="Adentro"
            tone="text-emerald-300 [text-shadow:0_0_20px_rgba(52,211,153,0.4)]"
          />
          <Stat value={String(yaSeFueron(event))} label="Salieron" />
          <Stat value={String(event.neverEntered)} label="Sin llegar" />
        </div>
      )}

      <OccupancyBar event={event} />

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-white/8 pt-3 text-xs text-white/45">
        <span>Vendidas: {event.sold}/{event.capacity}</span>
        <span>Recaudo: {currency.format(event.revenue)}</span>
        <span>Etapa: {event.currentStageName ?? "—"}</span>
        <span>Restantes: {event.remaining}</span>
        {event.entries > 0 && <span>Entradas contadas: {event.entries}</span>}
        {event.voided > 0 && <span className="text-[#ff8a8a]">Anuladas: {event.voided}</span>}
      </div>

      <p className="text-[11px] text-white/30">
        {event.lastScanAt
          ? `Último movimiento ${relativeTime(event.lastScanAt, now)}`
          : "Todavía nadie ha cruzado la puerta"}
      </p>
    </div>
  );
}

interface FeedItem {
  id: string;
  message: string;
  at: string;
}

function describe(name: string, payload: Record<string, unknown>): string | null {
  const ticket = payload.ticket as { attendeeName?: string } | undefined;
  const evento = payload.event as { name?: string } | undefined;
  const quien = ticket?.attendeeName ?? "alguien";
  const donde = evento?.name ? ` · ${evento.name}` : "";
  switch (name) {
    case "TicketAdmittedDomainEvent":
      return `✅ ${quien} entró${donde}`;
    case "TicketExitedDomainEvent":
      return `↩️ ${quien} salió${donde}`;
    case "TicketVoidedDomainEvent":
      return `❌ boleta de ${quien} anulada${donde}`;
    case "TicketPaymentConfirmedDomainEvent":
      return `💳 ${quien} pagó${donde}`;
    case "CourtesyTicketIssuedDomainEvent":
      return `🎁 cortesía para ${quien}${donde}`;
    case "EventSoldOutDomainEvent":
      return `🔥 se agotó${donde}`;
    default:
      return null;
  }
}

/**
 * `serverNow` viene del server y se usa en el primer render del cliente también: si cada
 * lado leyera su propio reloj, las fases y los "hace X min" no coincidirían y React
 * rompería la hidratación. Después de montar, un intervalo lo va adelantando.
 */
export function SalasView({
  events: initialEvents,
  serverNow,
}: {
  events: AdminEventSummary[];
  serverNow: number;
}) {
  const [events, setEvents] = useState(initialEvents);
  const [now, setNow] = useState(serverNow);
  const [feed, setFeed] = useState<FeedItem[]>([]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/events", { cache: "no-store" });
    if (res.ok) {
      setEvents(await res.json());
    }
  }, []);

  const handleStreamEvent = useCallback(
    (streamEvent: DomainStreamEvent) => {
      if (!RELEVANT_EVENT_NAMES.has(streamEvent.name)) return;
      const message = describe(streamEvent.name, streamEvent.payload as Record<string, unknown>);
      if (message) {
        setFeed((prev) =>
          [{ id: crypto.randomUUID(), message, at: new Date().toISOString() }, ...prev].slice(0, 8),
        );
      }
      void refresh();
    },
    [refresh],
  );

  useAdminStream(handleStreamEvent);

  const ordered = useMemo(() => {
    const rank: Record<Phase, number> = { "en-curso": 0, proxima: 1, terminada: 2 };
    return [...events].sort((a, b) => {
      const byPhase = rank[phaseOf(a, now)] - rank[phaseOf(b, now)];
      if (byPhase !== 0) return byPhase;
      // Las próximas de la más cercana a la más lejana; las terminadas, de la más reciente.
      return phaseOf(a, now) === "terminada"
        ? b.date.localeCompare(a.date)
        : a.date.localeCompare(b.date);
    });
  }, [events, now]);

  const totalAdentro = useMemo(
    () => events.reduce((sum, event) => sum + event.inside, 0),
    [events],
  );
  const salasActivas = useMemo(
    () => events.filter((event) => phaseOf(event, now) === "en-curso").length,
    [events, now],
  );

  if (events.length === 0) {
    return (
      <div className="fama-card px-6 py-16 text-center">
        <p className="text-lg font-medium">No hay salas activas.</p>
        <p className="mt-2 text-sm text-white/45">Publica una fecha para verla acá en vivo.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="fama-kicker">En vivo</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Salas</h1>
        </div>
        <div className="flex gap-8 text-right">
          <div>
            <div className="text-3xl font-semibold text-emerald-300 [text-shadow:0_0_24px_rgba(52,211,153,0.45)]">
              {totalAdentro}
            </div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
              {totalAdentro === 1 ? "persona adentro" : "personas adentro"}
            </div>
          </div>
          <div>
            <div className="text-3xl font-semibold text-white/80">{salasActivas}</div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
              {salasActivas === 1 ? "sala activa" : "salas activas"}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {ordered.map((event) => (
          <SalaCard key={event.id} event={event} now={now} />
        ))}
      </div>

      <div className="mt-8">
        <p className="fama-kicker mb-3">Movimiento</p>
        {feed.length === 0 ? (
          <p className="text-sm text-white/35">Esperando movimiento…</p>
        ) : (
          <div className="space-y-2">
            {feed.map((item) => (
              <div key={item.id} className="fama-card flex justify-between gap-4 px-4 py-2.5 text-sm">
                <span>{item.message}</span>
                <span className="shrink-0 text-white/30">{relativeTime(item.at, now)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
