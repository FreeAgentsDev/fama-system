import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WompiCheckoutButton } from "@/components/wompi-checkout-button";
import { getEventBySlug } from "@/lib/api";

// Los cupos/etapas cambian seguido la noche del evento — no lo dejamos estático de más.
export const revalidate = 15;

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
  hour12: true,
});

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Server Component: no hay re-render en el navegador, pero extraemos `Date.now()` a una
// función aparte para que el linter de reglas de React no la marque como llamada impura.
function isInThePast(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const event = await getEventBySlug(slug);
    const priceLabel = event.currentStage
      ? `Cover desde ${currency.format(event.currentStage.price)}.`
      : "Evento agotado.";
    const title = `${event.name} — Fama MZL`;
    const description = `Aparta tu boleta para ${event.name} en Fama MZL, Manizales. ${priceLabel}`;
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: event.coverImageUrl ? [{ url: event.coverImageUrl }] : undefined,
      },
    };
  } catch {
    return { title: "Fama MZL" };
  }
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let event;
  try {
    event = await getEventBySlug(slug);
  } catch {
    notFound();
  }

  const eventDate = new Date(event.date);
  const isPast = isInThePast(event.date);
  const isHidden = event.status === "cancelled";
  const stage = event.currentStage;
  const stageRemaining = stage ? stage.capacity - stage.soldCount : 0;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-md px-4 py-8">
        {event.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- flyer viene de una URL externa arbitraria que sube Daniel
          <img
            src={event.coverImageUrl}
            alt={event.name}
            className="mb-6 w-full rounded-xl object-cover"
          />
        ) : (
          <div className="mb-6 flex h-56 w-full items-center justify-center rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-700">
            <span className="text-lg font-semibold text-neutral-500">FAMA MZL</span>
          </div>
        )}

        <h1 className="text-3xl font-black">{event.name}</h1>
        <p className="mt-1 text-neutral-400">
          {event.venue} · {capitalize(dateFormatter.format(eventDate))} · {timeFormatter.format(eventDate)}
        </p>

        <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-950 p-5">
          {isHidden ? (
            <p className="text-center text-lg font-semibold text-neutral-400">
              Este evento ya no está disponible.
            </p>
          ) : isPast ? (
            <p className="text-center text-lg font-semibold text-neutral-400">
              Este evento ya ocurrió.
            </p>
          ) : !stage ? (
            <p className="text-center text-lg font-semibold text-red-400">
              Este evento está agotado.
            </p>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-wide text-amber-400">
                Etapa actual: {stage.name}
              </p>
              <p className="mt-1 text-3xl font-black">
                {currency.format(event.publicPrice)} <span className="text-base font-normal text-neutral-400">por persona</span>
              </p>
              {stageRemaining > 0 && stageRemaining <= 20 && (
                <p className="mt-1 text-sm text-neutral-400">
                  Quedan {stageRemaining} boletas a este precio
                </p>
              )}

              <div className="mt-5">
                <WompiCheckoutButton eventId={event.id} eventSlug={event.slug} />
              </div>
            </>
          )}
        </div>

        <div className="mt-8 border-t border-neutral-800 pt-6 text-sm text-neutral-400">
          <p className="mb-3 font-semibold text-neutral-300">¿Cómo funciona?</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Completa el formulario</li>
            <li>Paga con tarjeta, Nequi o PSE</li>
            <li>Recibes tu QR por WhatsApp</li>
            <li>Muestras el QR en la puerta</li>
          </ol>
          <p className="mt-4 text-xs text-neutral-500">
            Sin cargos de servicio. El pago va directo a Fama.
          </p>
        </div>
      </div>
    </main>
  );
}
