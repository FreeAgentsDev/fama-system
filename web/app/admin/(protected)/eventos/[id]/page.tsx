import { notFound } from "next/navigation";
import { eventNameOf, iracaGet } from "@/lib/iraca-server";
import type { BoxOfficeSnapshot } from "@/lib/admin-types";
import { EventDetail } from "@/components/admin/event-detail";

export const dynamic = "force-dynamic";

export default async function EventoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await iracaGet<BoxOfficeSnapshot>(
    `/events/get-event-box-office?id=${encodeURIComponent(id)}`,
  );
  if (eventNameOf(result.meta.code) !== "GottenBoxOfficeDomainEvent") {
    notFound();
  }

  return <EventDetail initialSnapshot={result.data} />;
}
