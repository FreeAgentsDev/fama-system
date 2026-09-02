"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminEventSummary } from "@/lib/admin-types";

const currency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
});

const STATUS_LABEL: Record<AdminEventSummary["status"], string> = {
  published: "Publicado",
  "sold-out": "Agotado",
  cancelled: "Oculto",
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
    <tr className="border-b border-neutral-900">
      <td className="py-3 pr-4">
        <Link href={`/admin/eventos/${event.id}`} className="font-medium text-white hover:underline">
          {event.name}
        </Link>
        <div className="text-xs text-neutral-500">{event.venue}</div>
      </td>
      <td className="py-3 pr-4 text-neutral-300">{dateFormatter.format(new Date(event.date))}</td>
      <td className="py-3 pr-4 text-neutral-300">{event.currentStageName ?? "—"}</td>
      <td className="py-3 pr-4 text-neutral-300">
        {event.sold}/{event.capacity}
      </td>
      <td className="py-3 pr-4 text-neutral-300">{currency.format(event.revenue)}</td>
      <td className="py-3 pr-4">
        <span
          className={`rounded px-2 py-1 text-xs font-medium ${
            event.status === "published"
              ? "bg-green-900 text-green-300"
              : event.status === "sold-out"
                ? "bg-amber-900 text-amber-300"
                : "bg-neutral-800 text-neutral-400"
          }`}
        >
          {STATUS_LABEL[event.status]}
        </span>
      </td>
      <td className="py-3 text-right">
        <div className="flex justify-end gap-2">
          <Link
            href={`/admin/eventos/${event.id}`}
            className="rounded border border-neutral-700 px-3 py-1 text-xs text-neutral-200 hover:bg-neutral-800"
          >
            Ver detalle
          </Link>
          <button
            type="button"
            onClick={toggleVisibility}
            disabled={loading}
            className="rounded border border-neutral-700 px-3 py-1 text-xs text-neutral-200 hover:bg-neutral-800 disabled:opacity-50"
          >
            {event.status === "cancelled" ? "Publicar" : "Ocultar"}
          </button>
        </div>
      </td>
    </tr>
  );
}
