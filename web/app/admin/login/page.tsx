"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xs rounded-lg border border-neutral-800 bg-neutral-950 p-8"
      >
        <h1 className="mb-1 text-xl font-bold text-white">Fama — Admin</h1>
        <p className="mb-6 text-sm text-neutral-400">Ingresa tu PIN para continuar.</p>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          placeholder="PIN"
          className="mb-3 w-full rounded border border-neutral-700 bg-neutral-900 px-4 py-3 text-center text-lg tracking-widest text-white"
        />
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading || !pin}
          className="w-full rounded bg-amber-400 px-4 py-3 font-semibold text-black transition hover:bg-amber-300 disabled:opacity-50"
        >
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
