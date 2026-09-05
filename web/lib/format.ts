/**
 * Formateo de fechas compartido entre server y cliente.
 *
 * `Intl.DateTimeFormat` con `timeStyle` no produce el mismo string en Node que en el
 * navegador aunque coincidan locale y zona horaria: la data ICU de cada uno mete un
 * separador distinto antes de "p. m." — Node usa U+00A0 (espacio duro) y el navegador un
 * espacio normal. React compara texto carácter por carácter al hidratar, así que un
 * componente cliente que formatee la fecha en las dos pasadas rompe la hidratación con
 * dos strings que en pantalla se ven idénticos.
 *
 * Normalizar los espacios raros deja ambos lados iguales sin tener que renderizar la
 * fecha solo en el server.
 */
const DATE_TIME = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
});

const DATE_LONG = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "numeric",
  minute: "2-digit",
});

/** U+00A0 (no-break space) y U+202F (narrow no-break space) → espacio normal. */
function normalizeSpaces(value: string): string {
  return value.replace(/[  ]/g, " ");
}

export function formatDateTime(iso: string): string {
  return normalizeSpaces(DATE_TIME.format(new Date(iso)));
}

export function formatDateLong(iso: string): string {
  return normalizeSpaces(DATE_LONG.format(new Date(iso)));
}
