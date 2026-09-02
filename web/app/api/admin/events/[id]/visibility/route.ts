import { NextResponse } from "next/server";
import { eventNameOf, iracaPost } from "@/lib/iraca-server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const body = await request.json().catch(() => ({}) as { hidden?: boolean });

  const path = body.hidden ? "/events/hide-event" : "/events/publish-event";
  const expected = body.hidden ? "EventCancelledDomainEvent" : "EventPublishedDomainEvent";

  const result = await iracaPost(path, { eventId: id });
  const name = eventNameOf(result.meta.code);
  if (name !== expected) {
    return NextResponse.json({ error: name }, { status: 400 });
  }
  return NextResponse.json(result.data);
}
