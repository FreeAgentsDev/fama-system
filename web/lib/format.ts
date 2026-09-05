/**
 * Formateo de fechas compartido entre server y cliente.
 *
 * Hay **dos** trampas acá, y las dos ya mordieron:
 *
 * 1. **Zona horaria.** Sin `timeZone` explícito, `Intl` usa la del runtime: la de la máquina
 *    en local (Colombia) y **UTC en Vercel**. Una fecha guardada como
 *    `2026-09-13T03:00:00.000Z` — sábado 9:00 p. m. en Manizales — se mostraba en producción
 *    como "domingo 13 a las 3:00 a. m.". Todas las fechas del sitio salían corridas 5 horas
 *    y, casi siempre, un día adelante. Por eso todo formateo pasa por acá y no por un
 *    `Intl.DateTimeFormat` suelto en cada página.
 *
 * 2. **Hidratación.** `Intl.DateTimeFormat` no produce el mismo string en Node que en el
 *    navegador aunque coincidan locale y zona: la data ICU de cada uno mete un separador
 *    distinto antes de "p. m." — Node usa U+00A0 y el navegador un espacio normal. React
 *    compara texto carácter por carácter al hidratar, así que un componente cliente que
 *    formatee en las dos pasadas rompe la hidratación con dos strings que se ven idénticos.
 *    Normalizar los espacios raros deja ambos lados iguales.
 */

/** Fama está en Manizales. Todo lo que ve el público se muestra en esta zona, no en la del server. */
export const FAMA_TIME_ZONE = "America/Bogota";

const DATE_TIME = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: FAMA_TIME_ZONE,
});

const DATE_LONG = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "numeric",
  minute: "2-digit",
  timeZone: FAMA_TIME_ZONE,
});

/** "sábado, 12 de septiembre" — sin hora. */
const DATE_ONLY = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: FAMA_TIME_ZONE,
});

/** "9:00 p. m." */
const TIME_ONLY = new Intl.DateTimeFormat("es-CO", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: FAMA_TIME_ZONE,
});

const DAY_NUMBER = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  timeZone: FAMA_TIME_ZONE,
});

const MONTH_SHORT = new Intl.DateTimeFormat("es-CO", {
  month: "short",
  timeZone: FAMA_TIME_ZONE,
});

/** U+00A0 (no-break space) y U+202F (narrow no-break space) → espacio normal. */
function normalizeSpaces(value: string): string {
  return value.replace(/[  ]/g, " ");
}

export function formatDateTime(iso: string): string {
  return normalizeSpaces(DATE_TIME.format(new Date(iso)));
}

export function formatDateLong(iso: string): string {
  return normalizeSpaces(DATE_LONG.format(new Date(iso)));
}

/** "sábado, 12 de septiembre" */
export function formatEventDate(iso: string | Date): string {
  return normalizeSpaces(DATE_ONLY.format(new Date(iso)));
}

/** "9:00 p. m." */
export function formatEventTime(iso: string | Date): string {
  return normalizeSpaces(TIME_ONLY.format(new Date(iso)));
}

/** "12" — para el taco de fecha de la cartelera. */
export function formatDayNumber(iso: string | Date): string {
  return DAY_NUMBER.format(new Date(iso));
}

/** "sept" — sin el punto final que mete el locale. */
export function formatMonthShort(iso: string | Date): string {
  return MONTH_SHORT.format(new Date(iso)).replace(".", "");
}

/** Primera letra en mayúscula: `es-CO` devuelve los días y meses en minúscula. */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
