"use client";

import { useState } from "react";
import { IracaRequestError, reserveTicket } from "@/lib/api";
import { checkoutRedirectOrigin } from "@/lib/checkout-origin";

interface WompiWidgetTransactionResult {
  transaction?: { id?: string; status?: string };
}

interface WompiWidgetInstance {
  /** El widget exige una función de respuesta — sin ella tira "Debes especificar una función
   *  de respuesta" y nunca abre. La navegación real la hace `redirectUrl`; la confirmación
   *  real llega por el webhook (`app/api/wompi/webhook/route.ts`), nunca por este callback. */
  open: (onResult: (result: WompiWidgetTransactionResult) => void) => void;
}

interface WompiWidgetConfig {
  currency: "COP";
  amountInCents: number;
  reference: string;
  publicKey: string;
  redirectUrl: string;
  /** Firma de integridad (SHA256 de referencia+monto+moneda+secreto), calculada en el server —
   *  ver `wompiIntegritySignature` en el dominio. Sin ella, algunas cuentas de Wompi rechazan
   *  el pago directamente. */
  signature?: { integrity: string };
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
        // Nunca `window.location.origin` a secas: con `localhost` el WAF de Wompi devuelve
        // 403 y el widget se queda cargando para siempre. Ver `lib/checkout-origin.ts`.
        redirectUrl: `${checkoutRedirectOrigin(window.location.origin)}/${eventSlug}/boleta/${ticket.id}`,
        ...(ticket.wompiSignature ? { signature: { integrity: ticket.wompiSignature } } : {}),
      });
      checkout.open((result) => {
        console.info("Wompi checkout:", result?.transaction?.id, result?.transaction?.status);
      });
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
        className="fama-input"
        placeholder="Nombre completo"
        value={name}
        onChange={(event) => setName(event.target.value)}
        disabled={disabled || loading}
      />
      <input
        className="fama-input"
        placeholder="Número de WhatsApp"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        disabled={disabled || loading}
      />
      {error && <p className="text-sm text-[#ff8a8a]">{error}</p>}
      <button type="button" onClick={handlePay} disabled={disabled || loading} className="fama-btn mt-1">
        {loading ? "Abriendo pago…" : "Apartar mi boleta"}
      </button>
    </div>
  );
}
