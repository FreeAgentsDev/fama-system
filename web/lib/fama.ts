/**
 * Datos reales del local. **Este es el único archivo que hay que editar** para que el portal
 * deje de mostrar información incompleta.
 *
 * Nada de esto se inventa: los campos que queden vacíos simplemente **no se renderizan**
 * (ver `visitanos.tsx` y `site-footer.tsx`), en vez de mostrar una dirección o un Instagram
 * falsos en la casa de un negocio real.
 *
 * Lo que sí es verdad y viene de la propuesta: Fama es un lounge en el barrio Milán, en
 * Manizales, y su voz es "Tragos con alma, noches con historia".
 */

export interface FamaVenue {
  /** Dirección de la calle, sin ciudad. Ej: "Cra 23 #64-32". */
  address: string;
  neighborhood: string;
  city: string;
  /** Cómo se describe la casa. Sale de la ficha pública del lugar. */
  concept: string;
  /** Géneros que suenan, para la sección de la casa. */
  music: string[];
  /** Usuario de Instagram SIN la arroba. Ej: "famamzl". */
  instagram: string;
  /** Solo dígitos, con indicativo país y sin "+". Ej: "573001234567". */
  whatsapp: string;
  /** Link de Google Maps del local. Si se deja vacío se arma uno con la dirección. */
  mapsUrl: string;
  /** Horarios visibles. Deja la lista vacía para ocultar la tarjeta. */
  hours: { days: string; time: string }[];
}

export const FAMA: FamaVenue = {
  // Dirección: la bio de instagram.com/fama_mzl dice "CRA 23 # 72 - 118 / Piso 2" y la ficha
  // pública del lugar la da como "Avenida Santander # 72-118, piso 2, entrada a Milán".
  // En Manizales la Carrera 23 ES la Avenida Santander, así que ambas coinciden — y eso
  // confirma el "casa en Milán" de la propuesta.
  address: "Av. Santander # 72-118, piso 2",
  neighborhood: "Entrada a Milán",
  city: "Manizales",

  // El concepto sale de la ficha pública del lugar: bar temático de los 80, retro-moderno.
  // Encaja con la foto del lounge, que tiene televisores de tubo apilados.
  concept: "Bar de los 80 en clave retro-moderna: coctelería de autor, hamburguesas artesanales y música que atraviesa décadas.",
  music: ["Rock en español", "House", "Disco", "Pop"],

  instagram: "fama_mzl",
  // Sin publicar en ninguna fuente. Pídeselo a Daniel.
  whatsapp: "",
  mapsUrl: "",

  // ⚠️ De la ficha pública, NO confirmados con Daniel. Verifícalos antes del lunes.
  hours: [{ days: "Viernes y sábado", time: "7:00 p. m. – 3:00 a. m." }],
};

/**
 * Fotos de la galería. Para agregar más: suelta los archivos en `web/public/galeria/` y
 * añádelos acá. Si la lista queda vacía, la sección de galería no se muestra.
 *
 * Arranca con material real de Fama que ya estaba en el repo: la foto del lounge y los
 * flyers de las tres noches.
 */
export const GALERIA: { src: string; alt: string }[] = [
  { src: "/brand/fama-lounge.png", alt: "El lounge de Fama en una noche" },
  { src: "/eventos/precupido.png", alt: "Flyer de la noche Precupido" },
  { src: "/eventos/love-house.png", alt: "Flyer de Love House Session" },
  { src: "/eventos/girls-power.png", alt: "Flyer de Girls Power" },
];

/** La frase de la casa, de la propuesta. */
export const FAMA_TAGLINE = "Tragos con alma, noches con historia.";

export function instagramUrl(venue: FamaVenue = FAMA): string | null {
  return venue.instagram ? `https://instagram.com/${venue.instagram}` : null;
}

export function whatsappUrl(venue: FamaVenue = FAMA): string | null {
  return venue.whatsapp ? `https://wa.me/${venue.whatsapp}` : null;
}

/** Dirección completa para mostrar, o `null` si todavía no está puesta. */
export function fullAddress(venue: FamaVenue = FAMA): string | null {
  if (!venue.address) return null;
  return [venue.address, venue.neighborhood, venue.city]
    .filter(Boolean)
    .join(" · ");
}

export function mapsUrl(venue: FamaVenue = FAMA): string | null {
  if (venue.mapsUrl) return venue.mapsUrl;
  if (!venue.address) return null;
  const query = [venue.address, venue.neighborhood, venue.city]
    .filter(Boolean)
    .join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
