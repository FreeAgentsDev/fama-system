import { NextResponse } from "next/server";
import { eventNameOf, iracaPost } from "@/lib/iraca-server";
import type { PublicEvent, UpdateEventInput } from "@/lib/admin-types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  let body: UpdateEventInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const result = await iracaPost<PublicEvent>("/events/update-event", {
    ...body,
    eventId: id,
  });
  const name = eventNameOf(result.meta.code);
  if (name !== "EventUpdatedDomainEvent") {
    // `message` viene cuando el dominio rechazó la edición con una razón concreta
    // (cupo por debajo de lo vendido, etapa con ventas, nombres repetidos).
    return NextResponse.json(
      { error: name, message: result.meta.message },
      { status: name === "EventNotFoundDomainEvent" ? 404 : 400 },
    );
  }
  return NextResponse.json(result.data);
}
