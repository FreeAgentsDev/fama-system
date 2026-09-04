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
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="fama-kicker">Panel</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Eventos</h1>
        </div>
        <Link href="/admin/eventos/nueva" className="fama-btn">
          Nueva fecha
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="fama-card px-6 py-16 text-center">
          <p className="text-lg font-medium">Todavía no has creado ningún evento.</p>
          <Link href="/admin/eventos/nueva" className="fama-btn mt-6 inline-flex">
            Crear la primera fecha
          </Link>
        </div>
      ) : (
        <div className="fama-card overflow-x-auto">
          <table className="fama-table min-w-[760px]">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Fecha</th>
                <th>Etapa</th>
                <th>Vendidos</th>
                <th>Recaudo</th>
                <th>Estado</th>
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
