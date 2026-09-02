import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { PendingRefresher } from "@/components/public/pending-refresher";
import { getTicketStatus } from "@/lib/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tu boleta — Fama MZL",
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
      <main className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-center text-white">
        <PendingRefresher />
        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-neutral-700 border-t-amber-400" />
        <h1 className="text-2xl font-bold">Confirmando tu pago…</h1>
        <p className="mt-2 max-w-sm text-neutral-400">
          Esto puede tardar unos segundos. No cierres ni recargues esta página — se actualiza sola.
        </p>
      </main>
    );
  }

  if (ticket.paymentStatus === "rejected") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-center text-white">
        <p className="text-4xl">❌</p>
        <h1 className="mt-4 text-2xl font-bold">No pudimos confirmar tu pago</h1>
        <p className="mt-2 max-w-sm text-neutral-400">
          Tu boleta para {event.name} no quedó pagada. Si crees que es un error o quieres
          intentar de nuevo, escríbenos por WhatsApp.
        </p>
      </main>
    );
  }

  const qrDataUrl = await QRCode.toDataURL(ticket.code, { margin: 1, width: 320 });

  return (
    <main className="flex min-h-screen flex-col items-center bg-black px-4 py-10 text-center text-white">
      <p className="text-sm font-semibold uppercase tracking-wide text-amber-400">
        ¡Boleta confirmada!
      </p>
      <h1 className="mt-1 text-2xl font-black">{event.name}</h1>
      <p className="mt-1 text-neutral-400">
        {event.venue} · {dateFormatter.format(new Date(event.date))}
      </p>

      <div className="mt-6 rounded-2xl bg-white p-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- data URL generado en el server, no un asset de next/image */}
        <img src={qrDataUrl} alt={`Código QR ${ticket.code}`} width={280} height={280} />
      </div>

      <p className="mt-4 text-lg font-bold">{ticket.attendeeName}</p>
      <p className="text-sm text-neutral-400">
        {ticket.stage} · {ticket.code}
      </p>

      <p className="mt-6 max-w-sm text-sm text-neutral-500">
        Guarda este QR (captura de pantalla) y muéstralo en la puerta. También te lo enviamos por
        WhatsApp.
      </p>
    </main>
  );
}
