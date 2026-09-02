"use client";

import { useState } from "react";
import { IracaRequestError, reserveTicket } from "@/lib/api";

interface WompiWidgetInstance {
  open: () => void;
}

interface WompiWidgetConfig {
  currency: "COP";
  amountInCents: number;
  reference: string;
  publicKey: string;
  redirectUrl: string;
}

declare global {
  interface Window {
    WidgetCheckout?: new (config: WompiWidgetConfig) => WompiWidgetInstance;
  }
}

interface WompiCheckoutButtonProps {
  eventId: string;
  eventSlug: string;
  disabled?: boolean;
}

/**
 * Formulario + botón de compra de la página pública (Fase 6). Reserva la boleta en el server
 * de Iraca (queda `pending`) y abre el checkout embebido de Wompi con `reference = ticket.id`,
 * que es lo que el webhook usará para confirmar el pago.
 *
 * El monto que se cobra SIEMPRE es `ticket.publicPrice` de la respuesta de `reserveTicket`, no
 * el precio que se veía en pantalla al cargar la página: si una etapa se agotó justo antes de
 * que este comprador reservara, el precio pudo subir — cobrar el de pantalla desincronizaría el
 * pago de Wompi con lo que el server realmente registró como `pricePaid`/`publicPrice`.
 */
export function WompiCheckoutButton({ eventId, eventSlug, disabled }: WompiCheckoutButtonProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setError(null);

    if (!name.trim() || !phone.trim()) {
      setError("Completa tu nombre y tu WhatsApp.");
      return;
    }

    const publicKey = process.env.NEXT_PUBLIC_WOMPI_KEY;
    if (!publicKey) {
      setError("Falta configurar NEXT_PUBLIC_WOMPI_KEY en web/.env.");
      return;
    }
    if (typeof window === "undefined" || !window.WidgetCheckout) {
      setError("No se pudo cargar la pasarela de pago. Refresca la página.");
      return;
    }

    setLoading(true);
    try {
      const ticket = await reserveTicket({ eventId, attendeeName: name, phone });
      const checkout = new window.WidgetCheckout({
        currency: "COP",
        amountInCents: ticket.publicPrice * 100,
        reference: ticket.paymentRef ?? ticket.id,
        publicKey,
        redirectUrl: `${window.location.origin}/${eventSlug}/boleta/${ticket.id}`,
      });
      checkout.open();
    } catch (err) {
      setError(
        err instanceof IracaRequestError
          ? err.message
          : "No se pudo iniciar el pago. Intenta de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        className="rounded border border-neutral-700 bg-neutral-900 px-4 py-3 text-white placeholder:text-neutral-500"
        placeholder="Nombre completo"
        value={name}
        onChange={(event) => setName(event.target.value)}
        disabled={disabled || loading}
      />
      <input
        className="rounded border border-neutral-700 bg-neutral-900 px-4 py-3 text-white placeholder:text-neutral-500"
        placeholder="Número de WhatsApp"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        disabled={disabled || loading}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="button"
        onClick={handlePay}
        disabled={disabled || loading}
        className="rounded bg-amber-400 px-6 py-3 font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Abriendo pago…" : "Apartar mi boleta →"}
      </button>
    </div>
  );
}
