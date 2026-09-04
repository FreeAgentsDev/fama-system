"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FamaLogo } from "@/components/brand/fama-logo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        setError("PIN incorrecto.");
        return;
      }
      const next = searchParams.get("next") || "/admin/eventos";
      router.push(next);
      router.refresh();
    } catch {
      setError("No se pudo conectar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fama-atmosphere flex min-h-screen items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="fama-card w-full max-w-sm p-8">
        <FamaLogo href={undefined} size="md" subtitle="Admin" />
        <p className="mt-6 text-sm text-white/55">Ingresa tu PIN para continuar.</p>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          placeholder="••••"
          className="fama-input mt-5 text-center text-2xl tracking-[0.5em]"
        />
        {error && <p className="mt-3 text-sm text-[#ff8a8a]">{error}</p>}
        <button type="submit" disabled={loading || !pin} className="fama-btn mt-5 w-full">
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
