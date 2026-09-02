"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CreateEventStageInput } from "@/lib/admin-types";

interface StageDraft extends CreateEventStageInput {
  key: string;
}

function emptyStage(): StageDraft {
  return { key: crypto.randomUUID(), name: "", price: 0, capacity: 0 };
}

export function CreateEventForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [venue, setVenue] = useState("Fama MZL");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [stages, setStages] = useState<StageDraft[]>([
    { key: crypto.randomUUID(), name: "Preventa", price: 20000, capacity: 50 },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function updateStage(key: string, patch: Partial<StageDraft>) {
    setStages((prev) => prev.map((stage) => (stage.key === key ? { ...stage, ...patch } : stage)));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim() || !date) {
      setError("Nombre y fecha son obligatorios.");
      return;
    }
    if (stages.length === 0 || stages.some((stage) => !stage.name.trim())) {
      setError("Cada etapa necesita un nombre.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          date: new Date(date).toISOString(),
          venue,
          coverImageUrl: coverImageUrl || undefined,
          stages: stages.map(({ name: stageName, price, capacity }) => ({
            name: stageName,
            price: Number(price),
            capacity: Number(capacity),
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "No se pudo crear el evento.");
        return;
      }
      const created = await res.json();
      router.push(`/admin/eventos/${created.id}`);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el server. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-5">
      <div>
        <label className="mb-1 block text-sm text-neutral-400">Nombre del evento</label>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Love House Session"
          className="w-full rounded border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-white"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm text-neutral-400">Fecha y hora</label>
          <input
            type="datetime-local"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-neutral-400">Lugar</label>
          <input
            value={venue}
            onChange={(event) => setVenue(event.target.value)}
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-white"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm text-neutral-400">Flyer (URL de la imagen)</label>
        <input
          value={coverImageUrl}
          onChange={(event) => setCoverImageUrl(event.target.value)}
          placeholder="https://…"
          className="w-full rounded border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-white"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm text-neutral-400">Etapas de precio</label>
          <button
            type="button"
            onClick={() => setStages((prev) => [...prev, emptyStage()])}
            className="text-xs text-amber-400 hover:underline"
          >
            + Agregar etapa
          </button>
        </div>
        <div className="space-y-2">
          {stages.map((stage) => (
            <div key={stage.key} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2">
              <input
                value={stage.name}
                onChange={(event) => updateStage(stage.key, { name: event.target.value })}
                placeholder="Preventa"
                className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
              />
              <input
                type="number"
                min={0}
                value={stage.price}
                onChange={(event) => updateStage(stage.key, { price: Number(event.target.value) })}
                placeholder="Precio COP"
                className="w-28 rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
              />
              <input
                type="number"
                min={0}
                value={stage.capacity}
                onChange={(event) => updateStage(stage.key, { capacity: Number(event.target.value) })}
                placeholder="Cupo"
                className="w-20 rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
              />
              <button
                type="button"
                onClick={() => setStages((prev) => prev.filter((s) => s.key !== stage.key))}
                disabled={stages.length === 1}
                className="text-neutral-500 hover:text-red-400 disabled:opacity-30"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          El precio que pones aquí es lo que recibe Daniel. El sistema calcula el precio público
          (con la comisión de Wompi incluida) automáticamente.
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded bg-amber-400 px-6 py-3 font-semibold text-black hover:bg-amber-300 disabled:opacity-50"
      >
        {loading ? "Guardando…" : "Guardar y publicar"}
      </button>
    </form>
  );
}
