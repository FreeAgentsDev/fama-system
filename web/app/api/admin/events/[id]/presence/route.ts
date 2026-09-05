import { NextResponse } from "next/server";
import { eventNameOf, iracaPost } from "@/lib/iraca-server";

/**
 * Marca entrada o salida a mano desde el admin, para cuando el QR no se deja leer
 * (pantalla rota, batería muerta, alguien que ya entró y el portero no alcanzó a marcar).
 *
 * Usa el mismo `scan-ticket` que la puerta en vez de un camino aparte: así el movimiento
 * queda en `ticket.scans` con su hora y su origen, y la sala en vivo se entera igual. El
 * `gate` es "admin" justamente para poder distinguirlo después de un escaneo real de puerta.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  await params;
  const body = await request.json().catch(() => ({}) as { code?: string });

  if (!body.code) {
    return NextResponse.json({ error: "missing code" }, { status: 400 });
  }

  const result = await iracaPost("/events/scan-ticket", {
    code: body.code,
    gate: "admin",
  });
  const name = eventNameOf(result.meta.code);
  if (name !== "TicketAdmittedDomainEvent" && name !== "TicketExitedDomainEvent") {
    return NextResponse.json(
      { error: name, message: result.meta.message },
      { status: 400 },
    );
  }
  return NextResponse.json({ outcome: name, ...(result.data as object) });
}
