import { connection } from "next/server";
import { iracaGet } from "@/lib/iraca-server";
import type { AdminEventSummary } from "@/lib/admin-types";

export interface SalasSnapshot {
  events: AdminEventSummary[];
  /**
   * Reloj del server. El cliente lo reusa en su primer render: si cada lado leyera su
   * propio reloj, las fases ("en curso" / "terminada") y los "hace X min" no coincidirían
   * y React rompería la hidratación.
   */
  now: number;
}

/**
 * Carga las salas junto con la hora del server.
 *
 * El timestamp se lee acá y no en el componente a propósito: `Date.now()` es impuro y la
 * página debe poder renderizarse dos veces con el mismo resultado. `connection()` lo difiere
 * a request time, que es como Next pide leer valores que cambian en cada petición
 * (docs 01-getting-started/08-caching.md).
 */
export async function loadSalas(): Promise<SalasSnapshot> {
  const result = await iracaGet<AdminEventSummary[]>("/events/list-events");
  // Los ocultos no aparecen: si no están publicados no hay puerta que atender.
  const events = (result.data ?? []).filter((event) => event.status !== "cancelled");

  await connection();
  return { events, now: Date.now() };
}
