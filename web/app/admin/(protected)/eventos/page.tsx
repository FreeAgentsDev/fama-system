import Link from "next/link";
import { iracaGet } from "@/lib/iraca-server";
import type { AdminEventSummary } from "@/lib/admin-types";
import { EventRow } from "@/components/admin/event-row";

export const dynamic = "force-dynamic";

export default async function AdminEventosPage() {
  const result = await iracaGet<AdminEventSummary[]>("/events/list-events");
  const events = result.data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Eventos</h1>
        <Link
          href="/admin/eventos/nueva"
          className="rounded bg-amber-400 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-300"
        >
          + Nueva fecha
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="text-neutral-400">Todavía no has creado ningún evento.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-neutral-400">
                <th className="py-2 pr-4 font-medium">Nombre</th>
                <th className="py-2 pr-4 font-medium">Fecha</th>
                <th className="py-2 pr-4 font-medium">Etapa</th>
                <th className="py-2 pr-4 font-medium">Vendidos/Cupo</th>
                <th className="py-2 pr-4 font-medium">Recaudo</th>
                <th className="py-2 pr-4 font-medium">Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
