import { NextResponse } from "next/server";
import { eventNameOf, iracaGet } from "@/lib/iraca-server";
import type { BoxOfficeSnapshot } from "@/lib/admin-types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const result = await iracaGet<BoxOfficeSnapshot>(
    `/events/get-event-box-office?id=${encodeURIComponent(id)}`,
  );
  const name = eventNameOf(result.meta.code);
  if (name !== "GottenBoxOfficeDomainEvent") {
    return NextResponse.json({ error: name }, { status: 404 });
  }
  return NextResponse.json(result.data);
}
