import { isValidWompiSignature, type WompiEventBody } from "@/lib/wompi-signature";

/**
 * Wompi llama este endpoint cuando cambia el estado de una transacción.
 * Flujo: verificar firma → si está APPROVED/DECLINED, avisarle al server de Iraca
 * (ConfirmPaymentUsecase) para que actualice el ticket y arme el link de WhatsApp.
 */
export async function POST(request: Request): Promise<Response> {
  const eventsSecret = process.env.WOMPI_EVENTS_SECRET;
  const internalSecret = process.env.INTERNAL_WEBHOOK_SECRET;
  const iracaUrl = process.env.IRACA_URL;

  if (!eventsSecret || !internalSecret || !iracaUrl) {
    console.error(
      "Webhook de Wompi mal configurado: faltan WOMPI_EVENTS_SECRET, INTERNAL_WEBHOOK_SECRET o IRACA_URL en web/.env.",
    );
    return Response.json({ error: "server misconfigured" }, { status: 500 });
  }

  let body: WompiEventBody;
  try {
    body = (await request.json()) as WompiEventBody;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  if (!isValidWompiSignature(body, eventsSecret)) {
    return Response.json({ error: "invalid signature" }, { status: 401 });
  }

  const transaction = body.data?.transaction;
  if (!transaction?.reference) {
    return Response.json({ ok: true });
  }

  // PENDING/VOIDED en tránsito: no hay nada que confirmar todavía, esperamos el próximo evento.
  if (transaction.status !== "APPROVED" && transaction.status !== "DECLINED" && transaction.status !== "ERROR") {
    return Response.json({ ok: true });
  }

  const status = transaction.status === "APPROVED" ? "approved" : "declined";

  const response = await fetch(`${iracaUrl}/events/confirm-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      paymentReference: transaction.reference,
      wompiTransactionId: transaction.id,
      status,
      internalSecret,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("El server de Iraca rechazó confirm-payment:", response.status, text);
    return Response.json({ error: "upstream error" }, { status: 502 });
  }

  return Response.json({ ok: true });
}
