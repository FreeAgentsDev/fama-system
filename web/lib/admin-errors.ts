/**
 * Traduce lo que responde Iraca a algo que Daniel pueda leer.
 *
 * Las rutas de `app/api/admin/*` devuelven `{ error, message? }`, donde `error` es el nombre
 * del DomainEvent y `message` (si viene) es el texto que lanzó el dominio. El mensaje del
 * dominio siempre gana: es más específico ("La etapa X ya vendió 17 boletas") que cualquier
 * cosa genérica que podamos escribir acá.
 */
const BY_EVENT_NAME: Record<string, string> = {
  EventSlugTakenDomainEvent:
    "Ya hay otra noche con esa misma URL. Cámbiale el nombre o edítale el enlace.",
  EventNotFoundDomainEvent: "Ese evento ya no existe.",
  EventCancelledDomainEvent: "El evento está oculto. Publícalo antes de seguir.",
  EventSoldOutDomainEvent: "El evento está agotado.",
  TicketNotFoundDomainEvent: "No encontramos esa boleta.",
  TicketCannotBeVoidedDomainEvent: "Esa boleta ya no se puede anular.",
  TicketVoidedDomainEvent: "Esa boleta está anulada.",
};

export function adminErrorMessage(
  body: { error?: string; message?: string } | null | undefined,
  fallback: string,
): string {
  if (body?.message) {
    return body.message;
  }
  if (body?.error && BY_EVENT_NAME[body.error]) {
    return BY_EVENT_NAME[body.error];
  }
  return fallback;
}
