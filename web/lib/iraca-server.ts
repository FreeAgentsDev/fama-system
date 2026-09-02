/**
 * Cliente server-only hacia Iraca, usado exclusivamente por las rutas `app/api/admin/*`.
 * A diferencia de `lib/api.ts` (que usa `NEXT_PUBLIC_IRACA_URL` para llamadas del navegador),
 * este módulo usa `IRACA_URL` — nunca se expone al bundle del cliente. Así, un visitante no
 * puede llamar `get-event-box-office` (nombres/teléfonos de compradores) saltándose el PIN de
 * `/admin`, porque el navegador nunca habla directo con Iraca para datos de admin.
 */

const IRACA_URL = process.env.IRACA_URL ?? "http://localhost:2436";

export interface IracaEnvelope<T> {
  meta: { code: string };
  data: T;
}

export function eventNameOf(code: string): string {
  return code.split(":").pop() ?? code;
}

export async function iracaGet<T>(path: string): Promise<IracaEnvelope<T>> {
  const res = await fetch(`${IRACA_URL}${path}`, { cache: "no-store" });
  return (await res.json()) as IracaEnvelope<T>;
}

export async function iracaPost<T>(path: string, body: unknown): Promise<IracaEnvelope<T>> {
  const res = await fetch(`${IRACA_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return (await res.json()) as IracaEnvelope<T>;
}

export { IRACA_URL };
