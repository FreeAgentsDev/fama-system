import Link from "next/link";
import { CreateEventForm } from "@/components/admin/create-event-form";

export default function NuevoEventoPage() {
  return (
    <div className="max-w-2xl">
      <Link href="/admin/eventos" className="text-sm text-white/45 hover:text-white">
        ← Eventos
      </Link>
      <p className="fama-kicker mt-6">Nueva fecha</p>
      <h1 className="mt-2 mb-8 text-3xl font-semibold tracking-tight">Publicar evento</h1>
      <CreateEventForm />
    </div>
  );
}
