"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminErrorMessage } from "@/lib/admin-errors";
import type { AdminEvent, UpdateEventStageInput } from "@/lib/admin-types";

interface StageDraft {
  key: string;
  name: string;
  price: number;
  capacity: number;
  /**
   * Nombre con el que la etapa llegó del server. Es lo que convierte un cambio de nombre en
   * un renombre (que conserva las ventas) y no en un borrar+crear (que las perdería).
   * `undefined` en una etapa nueva.
   */
  originalName?: string;
  /** Ventas ya hechas en esta etapa. Fija el piso del cupo y bloquea el borrado. */
  soldCount: number;
}

/** `datetime-local` necesita hora local sin zona; el server manda ISO en UTC. */
function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function EditEventForm({ event }: { event: AdminEvent }) {
  const router = useRouter();
  const [name, setName] = useState(event.name);
  const [slug, setSlug] = useState(event.slug);
  const [date, setDate] = useState(toLocalInput(event.date));
  const [venue, setVenue] = useState(event.venue);
  const [coverImageUrl, setCoverImageUrl] = useState(event.coverImageUrl ?? "");
  const [stages, setStages] = useState<StageDraft[]>(
    event.stages.map((stage) => ({
      key: crypto.randomUUID(),
      name: stage.name,
      price: stage.price,
      capacity: stage.capacity,
      originalName: stage.name,
      soldCount: stage.soldCount,
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function updateStage(key: string, patch: Partial<StageDraft>) {
    setStages((prev) => prev.map((stage) => (stage.key === key ? { ...stage, ...patch } : stage)));
  }

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setError(null);

    if (!name.trim() || !date) {
      setError("Nombre y fecha son obligatorios.");
      return;
    }
    if (stages.some((stage) => !stage.name.trim())) {
      setError("Cada etapa necesita un nombre.");
      return;
    }

    const payload: UpdateEventStageInput[] = stages.map((stage) => ({
      name: stage.name.trim(),
      price: Number(stage.price),
      capacity: Number(stage.capacity),
      ...(stage.originalName && stage.originalName !== stage.name.trim()
        ? { previousName: stage.originalName }
        : {}),
    }));

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/events/${event.id}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          date: new Date(date).toISOString(),
          venue,
          coverImageUrl: coverImageUrl.trim() || null,
          stages: payload,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(adminErrorMessage(body, "No se pudo guardar el evento."));
        return;
      }
      router.push(`/admin/eventos/${event.id}`);
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
        <input value={name} onChange={(e) => setName(e.target.value)} className="fama-input" />
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/55">Enlace público</label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/35">/</span>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} className="fama-input" />
        </div>
        <p className="mt-2 text-xs text-white/40">
          Si ya compartiste el link por Instagram o WhatsApp, cambiarlo rompe el que la gente
          tiene guardado.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm text-white/55">Fecha y hora</label>
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="fama-input"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-white/55">Lugar</label>
          <input value={venue} onChange={(e) => setVenue(e.target.value)} className="fama-input" />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/55">Flyer (URL de la imagen)</label>
        <input
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
          placeholder="/eventos/mi-flyer.png"
          className="fama-input"
        />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <label className="text-sm text-white/55">Etapas de precio</label>
          <button
            type="button"
            onClick={() =>
              setStages((prev) => [
                ...prev,
                { key: crypto.randomUUID(), name: "", price: 0, capacity: 0, soldCount: 0 },
              ])
            }
            className="text-xs text-[#e8b84a] hover:underline"
          >
            + Agregar etapa
          </button>
        </div>
        <div className="space-y-2">
          {stages.map((stage) => (
            <div key={stage.key}>
              <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2">
                <input
                  value={stage.name}
                  onChange={(e) => updateStage(stage.key, { name: e.target.value })}
                  placeholder="Preventa"
                  className="fama-input py-2.5"
                />
                <input
                  type="number"
                  min={0}
                  value={stage.price}
                  onChange={(e) => updateStage(stage.key, { price: Number(e.target.value) })}
                  className="fama-input w-28 py-2.5"
                />
                <input
                  type="number"
                  min={stage.soldCount || 1}
                  value={stage.capacity}
                  onChange={(e) => updateStage(stage.key, { capacity: Number(e.target.value) })}
                  className="fama-input w-20 py-2.5"
                />
                <button
                  type="button"
                  onClick={() => setStages((prev) => prev.filter((s) => s.key !== stage.key))}
                  disabled={stages.length === 1 || stage.soldCount > 0}
                  title={
                    stage.soldCount > 0
                      ? `No se puede quitar: ya vendió ${stage.soldCount} boletas`
                      : "Quitar etapa"
                  }
                  className="px-2 text-white/35 hover:text-[#ff8a8a] disabled:opacity-20"
                >
                  ✕
                </button>
              </div>
              {stage.soldCount > 0 && (
                <p className="mt-1 pl-1 text-xs text-white/35">
                  {stage.soldCount} vendidas · el cupo no puede bajar de ahí, y subir el precio
                  no le recobra nada a quien ya compró
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-[#ff8a8a]">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="fama-btn">
          {loading ? "Guardando…" : "Guardar cambios"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/admin/eventos/${event.id}`)}
          className="fama-btn-ghost"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
