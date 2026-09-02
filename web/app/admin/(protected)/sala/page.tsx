import { iracaGet } from "@/lib/iraca-server";
import type { AdminEventSummary } from "@/lib/admin-types";
import { SalaView } from "@/components/admin/sala-view";

export const dynamic = "force-dynamic";

/** El evento "vigente": el publicado con fecha más próxima. Si no hay uno, se deja elegir. */
export default async function SalaPage() {
  const result = await iracaGet<AdminEventSummary[]>("/events/list-events");
  const events = (result.data ?? []).filter((event) => event.status !== "cancelled");

  return <SalaView events={events} />;
}
