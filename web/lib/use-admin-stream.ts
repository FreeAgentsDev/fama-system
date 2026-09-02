"use client";

import { useEffect, useRef, useState } from "react";

export interface DomainStreamEvent {
  name: string;
  payload: unknown;
}

/** Se conecta a `/api/admin/stream` (proxy autenticado de Iraca) y llama `onEvent` por cada evento. */
export function useAdminStream(onEvent: (event: DomainStreamEvent) => void): { connected: boolean } {
  const handlerRef = useRef(onEvent);
  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = new EventSource("/api/admin/stream");

    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.addEventListener("domain", (raw) => {
      const messageEvent = raw as MessageEvent<string>;
      try {
        const parsed = JSON.parse(messageEvent.data) as DomainStreamEvent;
        handlerRef.current(parsed);
      } catch {
        // Frame que no se pudo parsear (p. ej. un comentario de keep-alive) — se ignora.
      }
    });

    return () => source.close();
  }, []);

  return { connected };
}
