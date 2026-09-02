"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { scanTicket, type ScanOutcome } from "@/lib/api";

const RESUME_DELAY_MS = 2000;

type ViewState =
  | { kind: "camera" }
  | { kind: "busy" }
  | { kind: "result"; outcome: ScanOutcome };

function vibrateFor(outcome: ScanOutcome) {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  if (outcome.kind === "admitted") navigator.vibrate(120);
  else if (outcome.kind === "exited") navigator.vibrate([80, 60, 80]);
  else navigator.vibrate(250);
}

function resultView(outcome: ScanOutcome): { bg: string; title: string; subtitle?: string } {
  if (outcome.kind === "admitted") {
    return { bg: "bg-green-600", title: `Bienvenido, ${outcome.attendeeName}`, subtitle: "ADENTRO" };
  }
  if (outcome.kind === "exited") {
    return {
      bg: "bg-yellow-500",
      title: outcome.attendeeName,
      subtitle: "YA ESTABA ADENTRO, ahora AFUERA",
    };
  }
  return { bg: "bg-red-600", title: "Código inválido o anulado" };
}

export function DoorScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const busyRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [view, setView] = useState<ViewState>({ kind: "camera" });
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [showManual, setShowManual] = useState(false);

  const handleDecoded = useCallback(async (rawText: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setView({ kind: "busy" });
    try {
      const code = rawText.trim().toUpperCase();
      const outcome = await scanTicket(code, "puerta");
      setView({ kind: "result", outcome });
      vibrateFor(outcome);
    } catch {
      const outcome: ScanOutcome = { kind: "rejected", reason: "not-found" };
      setView({ kind: "result", outcome });
      vibrateFor(outcome);
    } finally {
      resumeTimerRef.current = setTimeout(() => {
        busyRef.current = false;
        setView({ kind: "camera" });
      }, RESUME_DELAY_MS);
    }
  }, []);

  useEffect(() => {
    const reader = new BrowserQRCodeReader();
    let cancelled = false;

    reader
      .decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current!,
        (result) => {
          if (cancelled || !result) return;
          void handleDecoded(result.getText());
        },
      )
      .then((controls) => {
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      })
      .catch((error: unknown) => {
        setCameraError(
          error instanceof Error
            ? error.message
            : "No se pudo acceder a la cámara. Revisa los permisos en Chrome.",
        );
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, [handleDecoded]);

  function handleManualSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!manualCode.trim()) return;
    setShowManual(false);
    void handleDecoded(manualCode);
    setManualCode("");
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />

      {/* Marco guía */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-64 w-64 rounded-2xl border-4 border-amber-400/70" />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 to-transparent p-4 text-center">
        <p className="text-lg font-bold">Fama — Puerta</p>
        <p className="text-sm text-neutral-300">Apunta al QR de la boleta</p>
      </div>

      {cameraError && (
        <div className="absolute inset-x-0 top-24 mx-4 rounded bg-red-900/90 p-3 text-center text-sm">
          {cameraError}
        </div>
      )}

      {view.kind === "busy" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <p className="text-2xl font-semibold">Verificando…</p>
        </div>
      )}

      {view.kind === "result" &&
        (() => {
          const { bg, title, subtitle } = resultView(view.outcome);
          return (
            <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 ${bg} px-6 text-center`}>
              <p className="text-4xl">
                {view.outcome.kind === "admitted" ? "✅" : view.outcome.kind === "exited" ? "🔄" : "❌"}
              </p>
              <p className="text-3xl font-black leading-tight">{title}</p>
              {subtitle && <p className="text-xl font-bold tracking-wide">{subtitle}</p>}
            </div>
          );
        })()}

      <div className="absolute inset-x-0 bottom-0 flex justify-center p-4">
        {showManual ? (
          <form onSubmit={handleManualSubmit} className="flex w-full max-w-xs gap-2">
            <input
              autoFocus
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              placeholder="TQT-XXXXXXXX"
              className="flex-1 rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-center uppercase text-white"
            />
            <button type="submit" className="rounded bg-amber-400 px-4 py-2 font-semibold text-black">
              Ir
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowManual(true)}
            className="rounded-full bg-black/60 px-4 py-2 text-xs text-neutral-300"
          >
            Escribir código manualmente
          </button>
        )}
      </div>
    </div>
  );
}
