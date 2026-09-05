/**
 * Flyer de un evento, **sin recortar**.
 *
 * Los flyers que sube Daniel son verticales (los del repo van de 665x862 a 700x878, cerca
 * de 3:4) y antes se metían en una caja apaisada con `object-cover`: se perdían el título
 * de arriba y los créditos de abajo, que es justo la información del cartel.
 *
 * La solución es `object-contain` sobre una copia difuminada del mismo flyer: se ve el
 * cartel completo, sin barras negras, y el desenfoque hereda los colores de la pieza. Cuesta
 * una segunda decodificación de una imagen que el navegador ya tiene en caché.
 */
interface FlyerProps {
  src?: string;
  alt: string;
  /** Clases del contenedor: la relación de aspecto y el redondeado los pone quien lo usa. */
  className?: string;
  priority?: boolean;
}

export function Flyer({ src, alt, className = "", priority = false }: FlyerProps) {
  if (!src) {
    // Sin flyer: se cae al ambiente de la casa en vez de dejar un hueco.
    return (
      <div className={`fama-scan relative overflow-hidden bg-[#0d0b18] ${className}`}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_20%,rgba(155,107,255,0.28),transparent_65%)]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="fama-logo text-5xl opacity-80">Fama</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`fama-scan relative overflow-hidden ${className}`}>
      {/* Relleno: el mismo flyer, ampliado y difuminado, para no dejar barras negras. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- flyer de URL externa que sube Daniel */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full scale-125 object-cover opacity-40 blur-2xl"
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- flyer de URL externa que sube Daniel */}
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        className="relative h-full w-full object-contain"
      />
    </div>
  );
}
