import { EventContract } from "../domain/event.contract";
import { Event, expireStalePendingTickets } from "../domain/event.entity";

/**
 * Devuelve al inventario los cupos de las reservas que nunca se pagaron, y persiste el
 * cambio sólo si hubo alguno.
 *
 * Es la parte "perezosa" de la expiración: en vez de un cron, se llama desde los caminos
 * que ya leen el evento (reservar, ver la página pública, listar en el panel). Así el cupo
 * se recupera la próxima vez que alguien mire el evento, que es justo cuando importa.
 */
export async function releaseStaleHolds(
  contract: EventContract,
  event: Event,
): Promise<Event> {
  const { event: next, expired } = expireStalePendingTickets(event);
  if (expired.length === 0) {
    return event;
  }
  return contract.save(next);
}

/** Igual que `releaseStaleHolds`, para los casos de uso que listan varios eventos. */
export async function releaseStaleHoldsAll(
  contract: EventContract,
  events: Event[],
): Promise<Event[]> {
  return Promise.all(events.map((event) => releaseStaleHolds(contract, event)));
}
