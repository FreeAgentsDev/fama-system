import { IRACA_URL } from "@/lib/iraca-server";

// El stream de Iraca no tiene fin (SSE) y no debe cachearse ni pasar por el edge runtime.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Re-transmite `GET {IRACA_URL}/stream` protegido por el PIN de admin. Iraca no tiene
 * autenticación en su SSE (transmite nombres/teléfonos de compradores en cada scan/pago),
 * así que el navegador nunca se conecta directo — solo a este proxy, que sí exige la cookie.
 */
export async function GET(): Promise<Response> {
  const upstream = await fetch(`${IRACA_URL}/stream`, {
    headers: { Accept: "text/event-stream" },
    cache: "no-store",
  });

  if (!upstream.body) {
    return new Response("upstream sin body", { status: 502 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
