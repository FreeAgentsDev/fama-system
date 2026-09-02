import { Event, PriceStage, Ticket } from "../domain/event.entity";

/**
 * Convierte el agregado a un objeto plano apto para Firestore (sin `undefined`, sin clases).
 * Función pura — no toca Firestore, por eso se puede probar sin credenciales.
 */
export function eventToFirestoreData(event: Event): Record<string, unknown> {
  return JSON.parse(JSON.stringify(event));
}

/** Reconstruye el agregado `Event` desde el documento leído de Firestore. */
export function firestoreDataToEvent(data: Record<string, unknown>): Event {
  return {
    id: data.id as string,
    name: data.name as string,
    slug: data.slug as string,
    date: data.date as string,
    venue: data.venue as string,
    coverImageUrl: (data.coverImageUrl as string | undefined) ?? undefined,
    stages: ((data.stages as PriceStage[]) ?? []).map((stage) => ({ ...stage })),
    status: data.status as Event["status"],
    tickets: ((data.tickets as Ticket[]) ?? []).map((ticket) => ({
      ...ticket,
      scans: [...(ticket.scans ?? [])],
    })),
  };
}
