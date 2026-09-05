"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminErrorMessage } from "@/lib/admin-errors";
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
        const body = await res.json().catch(() => null);
        setError(adminErrorMessage(body, "No se pudo crear el evento."));
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
    <form onSubmit={handleSubmit} className="fama-card space-y-5 p-6 sm:p-8">
      <div>
        <label className="mb-2 block text-sm text-white/55">Nombre del evento</label>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Love House Session"
          className="fama-input"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm text-white/55">Fecha y hora</label>
          <input
            type="datetime-local"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="fama-input"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-white/55">Lugar</label>
          <input value={venue} onChange={(event) => setVenue(event.target.value)} className="fama-input" />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/55">Flyer (URL de la imagen)</label>
        <input
          value={coverImageUrl}
          onChange={(event) => setCoverImageUrl(event.target.value)}
          placeholder="https://…"
          className="fama-input"
        />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <label className="text-sm text-white/55">Etapas de precio</label>
          <button type="button" onClick={() => setStages((prev) => [...prev, emptyStage()])} className="text-xs text-[#e8b84a] hover:underline">
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
                className="fama-input py-2.5"
              />
              <input
                type="number"
                min={0}
                value={stage.price}
                onChange={(event) => updateStage(stage.key, { price: Number(event.target.value) })}
                placeholder="Precio COP"
                className="fama-input w-28 py-2.5"
              />
              <input
                type="number"
                min={0}
                value={stage.capacity}
                onChange={(event) => updateStage(stage.key, { capacity: Number(event.target.value) })}
                placeholder="Cupo"
                className="fama-input w-20 py-2.5"
              />
              <button
                type="button"
                onClick={() => setStages((prev) => prev.filter((s) => s.key !== stage.key))}
                disabled={stages.length === 1}
                className="px-2 text-white/35 hover:text-[#ff8a8a] disabled:opacity-30"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-white/40">
          El precio que pones aquí es lo que recibe Daniel. El sistema calcula el precio público (con la comisión de Wompi) automáticamente.
        </p>
      </div>

      {error && <p className="text-sm text-[#ff8a8a]">{error}</p>}

      <button type="submit" disabled={loading} className="fama-btn">
        {loading ? "Guardando…" : "Guardar y publicar"}
      </button>
    </form>
  );
}
