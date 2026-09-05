"use client";

/**
 * `PublicTicketView` (lo que ve esta página) no trae `phone` a propósito — es un endpoint
 * público sin PIN, y el teléfono del comprador no tiene por qué quedar expuesto en un link que
 * se puede reenviar. Por eso este botón usa `wa.me/?text=...` **sin número**: abre WhatsApp y
 * deja que la persona elija a quién mandárselo (a sí misma, a alguien más), en vez de asumir
 * un destinatario. El link se arma solo al hacer clic — nunca en el render — para no tocar
 * `window.location` mientras Next.js todavía puede estar renderizando en el server.
 */
export function WhatsAppSendButton({
  attendeeName,
  eventName,
}: {
  attendeeName: string;
  eventName: string;
}) {
  function handleClick() {
    const text =
      `Hola ${attendeeName} 👋 esta es tu boleta para ${eventName}. ` +
      `Guarda este link, tiene tu QR: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <button type="button" onClick={handleClick} className="fama-btn-ghost mt-4 text-sm">
      Enviarme el link por WhatsApp
    </button>
  );
}
