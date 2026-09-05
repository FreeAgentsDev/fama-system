/**
 * Origen público que se le manda a Wompi como `redirect-url` al abrir el widget.
 *
 * Wompi sirve `checkout.wompi.co` detrás de un WAF de AWS que responde **403 (CloudFront
 * "Request blocked")** a cualquier request cuyo `redirect-url` apunte a una dirección local
 * o privada. Verificado a mano contra el checkout real, con la misma llave y la misma firma:
 *
 *   redirect-url=http://localhost:3000/…        → 403
 *   redirect-url=http://127.0.0.1:3000/…        → 403
 *   redirect-url=http://192.168.1.10:3000/…     → 403
 *   redirect-url=https://fama-system.vercel.app/… → 200
 *   redirect-url=http://lvh.me:3000/…           → 200
 *
 * Cuando el WAF bloquea, el iframe del widget carga la página de error de CloudFront en vez
 * del checkout, así que nunca le reporta su altura al padre y `.waybox-modal` se queda en
 * `height: 0`. El comprador ve el fondo oscuro y el spinner para siempre, **sin ningún error
 * en la consola del navegador**, porque el fallo ocurre del lado del servidor de Wompi dentro
 * del iframe. Ese era el bug de "se queda cargando".
 *
 * En desarrollo se reescribe el host a `lvh.me` — un dominio público que resuelve a 127.0.0.1,
 * así que el WAF lo acepta y el redirect después del pago sigue llegando al server local.
 */

/** Hosts que el WAF de Wompi rechaza. */
const LOCAL_HOSTNAMES = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/i;
const PRIVATE_IPV4 = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

export function isLocalHostname(hostname: string): boolean {
  return LOCAL_HOSTNAMES.test(hostname) || PRIVATE_IPV4.test(hostname);
}

/**
 * Origen al que Wompi puede redirigir después del pago.
 *
 * En producción se toma de `NEXT_PUBLIC_PUBLIC_URL` (en Vercel: la URL del dominio). Si no
 * está puesta, se usa el origen del navegador, cambiando sólo el host cuando es local.
 */
export function checkoutRedirectOrigin(origin: string): string {
  const configured = process.env.NEXT_PUBLIC_PUBLIC_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  const url = new URL(origin);
  if (isLocalHostname(url.hostname)) {
    // Se conserva el puerto: `lvh.me:3000` sigue llegando al `next dev` de siempre.
    url.hostname = "lvh.me";
  }
  return url.origin;
}
