import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/brand/public-header";
import { WompiCheckoutButton } from "@/components/wompi-checkout-button";
import { getEventBySlug } from "@/lib/api";

// Sin `revalidate`: los fetch de lib/api.ts usan cache: "no-store", que fuerza render
// dinámico y deja la ventana de ISR sin efecto. El cupo restante debe ir al día.

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
    // publicPrice, no currentStage.price: el segundo es lo que recibe Daniel y el primero
    // es lo que paga el comprador. Esta descripción es la que se ve al compartir el link.
    const priceLabel = event.currentStage
      ? `Cover desde ${currency.format(event.publicPrice)}.`
      : "Evento agotado.";
    const title = event.name;
    const description = `Aparta tu boleta para ${event.name} en Fama MZL, Manizales. ${priceLabel}`;
    return {
      title,
      description,
      openGraph: {
        title: `${event.name} — Fama MZL`,
        description,
        images: event.coverImageUrl ? [{ url: event.coverImageUrl }] : undefined,
      },
    };
  } catch {
    return { title: "Fama MZL" };
  }
}

const STEPS = [
  { n: "01", t: "Completa tus datos" },
  { n: "02", t: "Paga con tarjeta, Nequi o PSE" },
  { n: "03", t: "Recibe tu QR por WhatsApp" },
  { n: "04", t: "Muéstralo en la puerta" },
];

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
    <div className="fama-atmosphere min-h-screen">
      <div className="mx-auto max-w-lg px-4 pb-16">
        <PublicHeader />

        <div className="overflow-hidden rounded-[1.6rem] border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          {event.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- flyer viene de una URL externa arbitraria que sube Daniel
            <img src={event.coverImageUrl} alt={event.name} className="h-72 w-full object-cover" />
          ) : (
            <div className="flex h-64 w-full items-end bg-[url('/brand/fama-lounge.png')] bg-cover bg-center">
              <div className="w-full bg-gradient-to-t from-black/80 to-transparent p-6">
                <span className="fama-logo text-5xl">Fama</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-7">
          <p className="fama-kicker">{event.venue}</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">{event.name}</h1>
          <p className="mt-2 text-white/60">
            {capitalize(dateFormatter.format(eventDate))} · {timeFormatter.format(eventDate)}
          </p>
        </div>

        <div className="fama-card mt-7 p-6">
          {isHidden ? (
            <p className="text-center text-lg font-medium text-white/60">Este evento ya no está disponible.</p>
          ) : isPast ? (
            <p className="text-center text-lg font-medium text-white/60">Este evento ya ocurrió.</p>
          ) : !stage ? (
            <p className="text-center text-lg font-semibold text-[#ff8a8a]">Este evento está agotado.</p>
          ) : (
            <>
              <p className="fama-kicker">Etapa actual · {stage.name}</p>
              <p className="mt-2 text-4xl font-semibold tracking-tight">
                {currency.format(event.publicPrice)}
                <span className="ml-2 text-base font-normal text-white/45">por persona</span>
              </p>
              {stageRemaining > 0 && stageRemaining <= 20 && (
                <p className="mt-2 text-sm text-[#e8b84a]">Quedan {stageRemaining} boletas a este precio</p>
              )}
              <div className="mt-6">
                <WompiCheckoutButton eventId={event.id} eventSlug={event.slug} />
              </div>
            </>
          )}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3">
          {STEPS.map((step) => (
            <div key={step.n} className="fama-card px-4 py-4">
              <p className="text-xs font-semibold tracking-[0.2em] text-[#4db8ff]">{step.n}</p>
              <p className="mt-1 text-sm text-white/80">{step.t}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-center text-xs text-white/40">Sin cargos de servicio. El pago va directo a Fama.</p>
      </div>
    </div>
  );
}
