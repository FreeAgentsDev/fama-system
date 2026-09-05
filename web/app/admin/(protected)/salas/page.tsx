import { SalasView } from "@/components/admin/salas-view";
import { loadSalas } from "@/lib/salas";

export const dynamic = "force-dynamic";

/** Todas las noches a la vez, en vivo. */
export default async function SalasPage() {
  const { events, now } = await loadSalas();

  return <SalasView events={events} serverNow={now} />;
}
