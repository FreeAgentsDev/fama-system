export const ADMIN_COOKIE_NAME = "fama-admin-token";

/**
 * Usa Web Crypto (`crypto.subtle`) en vez de `node:crypto` porque este módulo lo importa
 * `middleware.ts`, que por defecto corre en el runtime Edge (sin acceso a `node:crypto`).
 */
async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Comparación en tiempo constante para strings de igual longitud esperada (hex/PIN). */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * PIN único de Daniel (no hay cuentas de usuario), así que la sesión no necesita ser
 * "por usuario": basta un token fijo derivado de un secreto de firma que nunca sale del
 * server. El PIN en sí nunca queda guardado en la cookie del navegador.
 */
function sessionSecret(): string {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value) {
    throw new Error(
      "Falta ADMIN_SESSION_SECRET en web/.env — genera un valor random y ponlo ahí " +
        "(sirve para firmar la cookie de sesión de /admin, es independiente del PIN).",
    );
  }
  return value;
}

export function adminSessionToken(): Promise<string> {
  return hmacSha256Hex(sessionSecret(), "fama-admin-session");
}

export async function isValidAdminToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const expected = await adminSessionToken();
  return constantTimeEqual(token, expected);
}

export function isValidAdminPin(pin: string): boolean {
  const expected = process.env.FAMA_ADMIN_PIN;
  if (!expected) {
    throw new Error("Falta FAMA_ADMIN_PIN en web/.env.");
  }
  return constantTimeEqual(pin, expected);
}
