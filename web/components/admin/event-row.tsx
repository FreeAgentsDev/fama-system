"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/format";
import type { AdminEventSummary } from "@/lib/admin-types";

const currency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const STATUS_LABEL: Record<AdminEventSummary["status"], string> = {
  published: "Publicado",
  "sold-out": "Agotado",
  cancelled: "Oculto",
};

const STATUS_CLASS: Record<AdminEventSummary["status"], string> = {
  published: "bg-emerald-400/15 text-emerald-300",
  "sold-out": "bg-[#e8b84a]/15 text-[#e8b84a]",
  cancelled: "bg-white/8 text-white/45",
};

export function EventRow({ event }: { event: AdminEventSummary }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggleVisibility() {
    setLoading(true);
    try {
      await fetch(`/api/admin/events/${event.id}/visibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: event.status !== "cancelled" }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <tr>
      <td>
        <Link href={`/admin/eventos/${event.id}`} className="font-medium text-white hover:text-[#4db8ff]">
          {event.name}
        </Link>
        <div className="text-xs text-white/40">{event.venue}</div>
      </td>
      <td className="text-white/70">{formatDateTime(event.date)}</td>
      <td className="text-white/70">{event.currentStageName ?? "—"}</td>
      <td className="text-white/70">
        {event.sold}/{event.capacity}
      </td>
      <td className="text-white/70">{currency.format(event.revenue)}</td>
      <td>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[event.status]}`}>
          {STATUS_LABEL[event.status]}
        </span>
      </td>
      <td className="text-right">
        <div className="flex justify-end gap-2">
          <Link href={`/admin/eventos/${event.id}`} className="fama-btn-ghost px-3 py-1 text-xs">
            Detalle
          </Link>
          <Link
            href={`/admin/eventos/${event.id}/editar`}
            className="fama-btn-ghost px-3 py-1 text-xs"
          >
            Editar
          </Link>
          <button
            type="button"
            onClick={toggleVisibility}
            disabled={loading}
            className="fama-btn-ghost px-3 py-1 text-xs disabled:opacity-50"
          >
            {event.status === "cancelled" ? "Publicar" : "Ocultar"}
          </button>
        </div>
      </td>
    </tr>
  );
}
