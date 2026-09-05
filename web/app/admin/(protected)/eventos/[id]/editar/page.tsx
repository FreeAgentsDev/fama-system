import Link from "next/link";
import { notFound } from "next/navigation";
import { EditEventForm } from "@/components/admin/edit-event-form";
import { eventNameOf, iracaGet } from "@/lib/iraca-server";
import type { BoxOfficeSnapshot } from "@/lib/admin-types";

export const dynamic = "force-dynamic";

export default async function EditarEventoPage({
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
  const { event } = result.data;

  return (
    <div>
      <Link href={`/admin/eventos/${id}`} className="text-sm text-white/45 hover:text-white">
        ← {event.name}
      </Link>
      <p className="fama-kicker mt-6">Editar</p>
      <h1 className="mt-2 mb-8 text-3xl font-semibold tracking-tight">{event.name}</h1>
      <div className="max-w-2xl">
        <EditEventForm event={event} />
      </div>
    </div>
  );
}
