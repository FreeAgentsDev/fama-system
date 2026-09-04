import Link from "next/link";
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

  return (
    <div>
      <Link href="/admin/eventos" className="text-sm text-white/45 hover:text-white">
        ← Eventos
      </Link>
      <div className="mt-4">
        <EventDetail initialSnapshot={result.data} />
      </div>
    </div>
  );
}
