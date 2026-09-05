import Link from "next/link";
import { FamaLogo } from "@/components/brand/fama-logo";
import { Galeria } from "@/components/public/galeria";
import { LaCasa } from "@/components/public/la-casa";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteNav } from "@/components/public/site-nav";
import { Visitanos } from "@/components/public/visitanos";
import { Flyer } from "@/components/public/flyer";
import { listPublishedEvents, type PublicEvent } from "@/lib/api";
import { FAMA } from "@/lib/fama";
import {
  capitalize,
  formatDayNumber,
  formatEventDate,
  formatEventTime,
  formatMonthShort,
} from "@/lib/format";

// Sin `revalidate`: lib/api.ts hace los fetch con cache: "no-store", lo que fuerza
// render dinámico y deja sin efecto cualquier ventana de ISR. La cartelera se pide
// fresca en cada visita, que es lo que queremos cuando una etapa se puede agotar.

/** Debajo de esto la tarjeta muestra el aviso rojo de "quedan pocas". */
const POCAS_BOLETAS = 10;

const currency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function EventCard({ event }: { event: PublicEvent }) {
  const soldOut = event.status === "sold-out" || !event.currentStage;
  const quedanPocas = !soldOut && event.remaining > 0 && event.remaining <= POCAS_BOLETAS;
  const fecha = new Date(event.date);

  return (
    <Link
      href={`/${event.slug}`}
      className="fama-card group block overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-white/25"
    >
      <div className="relative">
        {/* 3:4 es la proporción de los flyers que sube Daniel, así que el desenfoque de
            relleno casi no se ve y el cartel se lee completo. */}
        <Flyer src={event.coverImageUrl} alt={event.name} className="aspect-[3/4] w-full" />

        {/* Sombra sólo abajo: las etiquetas necesitan contraste, el cartel no. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/85 to-transparent" />

        {/* Taco de fecha: se lee de un vistazo al hacer scroll. */}
        <div className="absolute left-3 top-3 rounded-xl border border-white/15 bg-black/60 px-3 py-1.5 text-center backdrop-blur">
          <p className="text-lg font-semibold leading-none">{formatDayNumber(fecha)}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
            {formatMonthShort(fecha)}
          </p>
        </div>

        <span
          className={`fama-chip absolute bottom-3 left-3 backdrop-blur ${quedanPocas ? "fama-urgente" : ""}`}
        >
          {soldOut ? "Agotado" : quedanPocas ? `Quedan ${event.remaining}` : event.currentStage?.name}
        </span>
      </div>

      <div className="p-5">
        <h3 className="text-xl font-semibold tracking-tight">{event.name}</h3>
        <p className="mt-1 text-sm text-white/55">
          {capitalize(formatEventDate(fecha))} · {formatEventTime(fecha)}
        </p>
        <div className="mt-4 flex items-baseline justify-between gap-3">
          <p className="text-lg font-semibold text-[#e8b84a]">
            {soldOut ? "Sin cupos" : `Desde ${currency.format(event.publicPrice)}`}
          </p>
          {!soldOut && (
            <span className="text-sm text-white/45 transition group-hover:text-white/75">
              Apartar →
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  let events: PublicEvent[] = [];
  let loadFailed = false;
  try {
    events = (await listPublishedEvents()).filter((event) => event.status !== "cancelled");
  } catch (error) {
    // Tragarse esto en silencio fue lo que escondió el bug del método HTTP: la cartelera
    // decía "no hay fechas" ante un 404 del backend. Un fallo de red no es una cartelera vacía.
    console.error("No se pudo cargar la cartelera:", error);
    loadFailed = true;
  }

  const proxima = events[0];

  return (
    <div className="fama-atmosphere flex flex-1 flex-col">
      <SiteNav />

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 sm:px-8">
        <section className="flex min-h-[82vh] flex-col items-center justify-center py-16 text-center">
          <p className="fama-kicker mb-5">
            {FAMA.neighborhood ? `${FAMA.neighborhood} · ` : ""}
            {FAMA.city}
          </p>

          <FamaLogo href={undefined} size="hero" />

          <p className="mt-7 max-w-lg text-base leading-relaxed text-white/70 sm:text-lg">
            Bar de los 80 en {FAMA.city}. Rock en español, house y disco hasta las 3 de la
            mañana. Aparta tu noche y entra con QR.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a href="#fechas" className="fama-btn">
              Ver próximas fechas
            </a>
            <a href="#la-casa" className="fama-btn-ghost">
              Conoce la casa
            </a>
          </div>

          {/* Adelanto de la próxima noche: la razón principal por la que alguien abre esto. */}
          {proxima && (
            <Link
              href={`/${proxima.slug}`}
              className="mt-14 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-white/12 bg-black/40 px-5 py-2.5 text-sm backdrop-blur transition hover:border-[#e8b84a]/50 hover:bg-black/60"
            >
              <span className="fama-kicker">Sigue</span>
              <span className="font-medium">{proxima.name}</span>
              <span className="text-white/45">{capitalize(formatEventDate(proxima.date))}</span>
            </Link>
          )}
        </section>

        <hr className="fama-rule" />

        <section id="fechas" className="scroll-mt-24 py-20">
          <p className="fama-kicker">Cartelera</p>
          <h2 className="fama-neon mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Próximas fechas
          </h2>

          <div className="mt-8">
            {loadFailed ? (
              <div className="fama-card px-6 py-14 text-center">
                <p className="text-lg font-medium">No pudimos cargar la cartelera.</p>
                <p className="mt-2 text-sm text-white/50">Refresca la página en un momento.</p>
              </div>
            ) : events.length === 0 ? (
              <div className="fama-card px-6 py-14 text-center">
                <p className="text-lg font-medium">Aún no hay fechas publicadas.</p>
                <p className="mt-2 text-sm text-white/50">
                  Vuelve pronto o sigue a Fama en Instagram.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
        </section>

        <hr className="fama-rule" />
        <LaCasa />
        {/* Galería y Visítanos traen su propia regla: si no hay datos no se renderizan, y
            así tampoco dejan un separador suelto. */}
        <Galeria />
        <Visitanos />
      </main>

      <SiteFooter />
    </div>
  );
}
