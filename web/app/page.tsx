import Link from "next/link";
import { FamaLogo } from "@/components/brand/fama-logo";
import { Galeria } from "@/components/public/galeria";
import { LaCasa } from "@/components/public/la-casa";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteNav } from "@/components/public/site-nav";
import { Visitanos } from "@/components/public/visitanos";
import { listPublishedEvents, type PublicEvent } from "@/lib/api";
import { FAMA } from "@/lib/fama";

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

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const timeFormatter = new Intl.DateTimeFormat("es-CO", {
  hour: "numeric",
  minute: "2-digit",
});

const dayFormatter = new Intl.DateTimeFormat("es-CO", { day: "numeric" });
const monthFormatter = new Intl.DateTimeFormat("es-CO", { month: "short" });

function EventCard({ event }: { event: PublicEvent }) {
  const soldOut = event.status === "sold-out" || !event.currentStage;
  const quedanPocas = !soldOut && event.remaining > 0 && event.remaining <= POCAS_BOLETAS;
  const fecha = new Date(event.date);

  return (
    <Link
      href={`/${event.slug}`}
      className="fama-card group block overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-white/25"
    >
      <div className="fama-scan relative h-52 overflow-hidden">
        {event.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- flyer de URL externa
          <img
            src={event.coverImageUrl}
            alt=""
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-[url('/brand/fama-lounge.png')] bg-cover bg-center" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

        {/* Taco de fecha: se lee de un vistazo al hacer scroll. */}
        <div className="absolute left-3 top-3 rounded-xl border border-white/15 bg-black/55 px-3 py-1.5 text-center backdrop-blur">
          <p className="text-lg font-semibold leading-none">{dayFormatter.format(fecha)}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
            {monthFormatter.format(fecha).replace(".", "")}
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
        <p className="mt-1 text-sm capitalize text-white/55">
          {dateFormatter.format(fecha)} · {timeFormatter.format(fecha)}
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
              <span className="capitalize text-white/45">
                {dateFormatter.format(new Date(proxima.date))}
              </span>
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
        <hr className="fama-rule" />
        <Galeria />
        <hr className="fama-rule" />
        <Visitanos />
      </main>

      <SiteFooter />
    </div>
  );
}
