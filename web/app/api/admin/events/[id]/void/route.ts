import { NextResponse } from "next/server";
import { eventNameOf, iracaPost } from "@/lib/iraca-server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const body = await request.json().catch(() => ({}) as { ticketId?: string });

  const result = await iracaPost("/events/void-ticket", {
    eventId: id,
    ticketId: body.ticketId,
  });
  const name = eventNameOf(result.meta.code);
  if (name !== "TicketVoidedDomainEvent") {
    return NextResponse.json({ error: name }, { status: 400 });
  }
  return NextResponse.json(result.data);
}
