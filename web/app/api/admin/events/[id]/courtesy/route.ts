import { NextResponse } from "next/server";
import { eventNameOf, iracaPost } from "@/lib/iraca-server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const body = await request
    .json()
    .catch(() => ({}) as { attendeeName?: string; phone?: string });

  const result = await iracaPost("/events/issue-courtesy-ticket", {
    eventId: id,
    attendeeName: body.attendeeName,
    phone: body.phone,
  });
  const name = eventNameOf(result.meta.code);
  if (name !== "CourtesyTicketIssuedDomainEvent") {
    return NextResponse.json({ error: name }, { status: 400 });
  }
  return NextResponse.json(result.data);
}
