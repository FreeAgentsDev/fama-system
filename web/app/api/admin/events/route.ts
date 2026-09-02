import { NextResponse } from "next/server";
import { eventNameOf, iracaGet, iracaPost } from "@/lib/iraca-server";
import type { AdminEventSummary, CreateEventInput, PublicEvent } from "@/lib/admin-types";

export async function GET(): Promise<Response> {
  const result = await iracaGet<AdminEventSummary[]>("/events/list-events");
  const name = eventNameOf(result.meta.code);
  if (name !== "GottenAdminEventsDomainEvent") {
    return NextResponse.json({ error: name }, { status: 502 });
  }
  return NextResponse.json(result.data);
}

export async function POST(request: Request): Promise<Response> {
  let body: CreateEventInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const result = await iracaPost<PublicEvent>("/events/create-event", body);
  const name = eventNameOf(result.meta.code);
  if (name !== "EventCreatedDomainEvent") {
    return NextResponse.json({ error: name }, { status: 400 });
  }
  return NextResponse.json(result.data);
}
