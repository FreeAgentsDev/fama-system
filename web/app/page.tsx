import Link from "next/link";
import { FamaLogo } from "@/components/brand/fama-logo";
import { Galeria } from "@/components/public/galeria";
import { LaCasa } from "@/components/public/la-casa";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteNav } from "@/components/public/site-nav";
import { Visitanos } from "@/components/public/visitanos";
import { listPublishedEvents, type PublicEvent } from "@/lib/api";

// Sin `revalidate`: lib/api.ts hace los fetch con cache: "no-store", lo que fuerza
// render dinámico y deja sin efecto cualquier ventana de ISR. La cartelera se pide
// fresca en cada visita, que es lo que queremos cuando una etapa se puede agotar.

const currency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

function EventCard({ event }: { event: PublicEvent }) {
  const soldOut = event.status === "sold-out" || !event.currentStage;
  return (
    <Link
      href={`/${event.slug}`}
      className="fama-card group block overflow-hidden transition hover:-translate-y-0.5 hover:border-white/20"
    >
      <div className="relative h-44 overflow-hidden">
        {event.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- flyer de URL externa
          <img src={event.coverImageUrl} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="h-full w-full bg-[url('/brand/fama-lounge.png')] bg-cover bg-center" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <span className="absolute bottom-3 left-3 rounded-full bg-black/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur">
          {soldOut ? "Agotado" : event.currentStage?.name}
        </span>
      </div>
      <div className="p-5">
        <h2 className="text-xl font-semibold tracking-tight">{event.name}</h2>
        <p className="mt-1 text-sm text-white/55">
          {event.venue} · {dateFormatter.format(new Date(event.date))}
        </p>
        <p className="mt-4 text-lg font-semibold text-[#e8b84a]">
          {soldOut ? "Sin cupos" : `Desde ${currency.format(event.publicPrice)}`}
        </p>
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
        <section className="flex min-h-[78vh] flex-col items-center justify-center py-16 text-center">
          <p className="fama-kicker mb-4">Manizales · Colombia</p>
          <FamaLogo href={undefined} size="hero" />
          <p className="mt-6 max-w-md text-base leading-relaxed text-white/70 sm:text-lg">
            Noches de lounge, neón y sonido. Aparta tu boleta y entra con QR.
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
              className="mt-12 inline-flex items-center gap-3 rounded-full border border-white/12 bg-black/35 px-5 py-2.5 text-sm backdrop-blur transition hover:border-[#e8b84a]/45 hover:bg-black/50"
            >
              <span className="fama-kicker">Sigue</span>
              <span className="font-medium">{proxima.name}</span>
              <span className="text-white/45">{dateFormatter.format(new Date(proxima.date))}</span>
            </Link>
          )}
        </section>

        <section id="fechas" className="scroll-mt-24 py-16">
          <p className="fama-kicker">Cartelera</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Próximas fechas</h2>

          <div className="mt-8">
            {loadFailed ? (
              <div className="fama-card px-6 py-14 text-center">
                <p className="text-lg font-medium">No pudimos cargar la cartelera.</p>
                <p className="mt-2 text-sm text-white/50">Refresca la página en un momento.</p>
              </div>
            ) : events.length === 0 ? (
              <div className="fama-card px-6 py-14 text-center">
                <p className="text-lg font-medium">Aún no hay fechas publicadas.</p>
                <p className="mt-2 text-sm text-white/50">Vuelve pronto o sigue a Fama en Instagram.</p>
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

        <LaCasa />
        <Galeria />
        <Visitanos />
      </main>

      <SiteFooter />
    </div>
  );
}
