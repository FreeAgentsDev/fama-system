import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { FamaLogo } from "@/components/brand/fama-logo";
import { PendingRefresher } from "@/components/public/pending-refresher";
import { getTicketStatus } from "@/lib/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tu boleta",
  robots: { index: false, follow: false },
};

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export default async function BoletaPage({
  params,
}: {
  params: Promise<{ slug: string; ticketId: string }>;
}) {
  const { ticketId } = await params;

  let data;
  try {
    data = await getTicketStatus(ticketId);
  } catch {
    notFound();
  }
  const { event, ticket } = data;

  if (ticket.paymentStatus === "pending") {
    return (
      <div className="fama-atmosphere flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <PendingRefresher />
        <div className="mb-5 h-11 w-11 animate-spin rounded-full border-2 border-white/15 border-t-[#e8b84a]" />
        <h1 className="text-2xl font-semibold">Confirmando tu pago</h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/55">
          Esto puede tardar unos segundos. No cierres ni recargues esta página — se actualiza sola.
        </p>
      </div>
    );
  }

  if (ticket.paymentStatus === "rejected") {
    return (
      <div className="fama-atmosphere flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <FamaLogo size="md" href={undefined} />
        <h1 className="mt-8 text-2xl font-semibold">No pudimos confirmar tu pago</h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/55">
          Tu boleta para {event.name} no quedó pagada. Si crees que es un error, escríbenos por WhatsApp.
        </p>
      </div>
    );
  }

  const qrDataUrl = await QRCode.toDataURL(ticket.code, {
    margin: 1,
    width: 320,
    color: { dark: "#0b0b10", light: "#ffffff" },
  });

  return (
    <div className="fama-atmosphere flex min-h-screen flex-col items-center px-4 py-10">
      <p className="fama-kicker">Boleta confirmada</p>
      <div className="fama-card mt-6 w-full max-w-sm overflow-hidden text-center">
        <div className="border-b border-white/10 bg-gradient-to-r from-[#4db8ff]/15 via-transparent to-[#e8b84a]/15 px-6 py-5">
          <FamaLogo size="sm" href={undefined} />
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">{event.name}</h1>
          <p className="mt-1 text-sm text-white/55">
            {event.venue} · {dateFormatter.format(new Date(event.date))}
          </p>
        </div>
        <div className="flex flex-col items-center px-6 py-6">
          <div className="rounded-2xl bg-white p-3 shadow-[0_0_40px_rgba(77,184,255,0.18)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL generado en el server */}
            <img src={qrDataUrl} alt={`Código QR ${ticket.code}`} width={240} height={240} />
          </div>
          <p className="mt-5 text-lg font-semibold">{ticket.attendeeName}</p>
          <p className="mt-1 text-sm tracking-[0.18em] text-white/45">
            {ticket.stage} · {ticket.code}
          </p>
        </div>
      </div>
      <p className="mt-6 max-w-sm text-center text-sm text-white/45">
        Guarda este QR y muéstralo en la puerta. También te lo enviamos por WhatsApp.
      </p>
    </div>
  );
}
