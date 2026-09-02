import type { CollectionReference, QueryDocumentSnapshot } from "firebase-admin/firestore";
import {
  getFirestore,
  hasFirebaseCredentials,
} from "../../../infrastructure/firestore/firestore.client";
import { EventContract } from "../domain/event.contract";
import { Event, Ticket } from "../domain/event.entity";
import { eventToFirestoreData, firestoreDataToEvent } from "./firestore-event.mapper";

const COLLECTION = "events";

/**
 * Implementación real (Firestore) del `EventContract`.
 *
 * Si no hay credenciales de Firebase en el `.env`, usa un `Map` en memoria del proceso como
 * red de seguridad para poder seguir desarrollando localmente sin bloquear el resto de fases.
 * En Railway, con `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`
 * puestas, lee y escribe directamente en Firestore sin ningún cambio de código.
 */
export class FirestoreEventContract extends EventContract {
  private readonly localFallback = new Map<string, Event>();
  private warned = false;

  async save(event: Event): Promise<Event> {
    if (!this.useFirestore()) {
      this.localFallback.set(event.id, this.clone(event));
      return this.clone(event);
    }
    await this.collection().doc(event.id).set(eventToFirestoreData(event));
    return event;
  }

  async getById(id: string): Promise<Event | null> {
    if (!this.useFirestore()) {
      const found = this.localFallback.get(id);
      return found ? this.clone(found) : null;
    }
    const snap = await this.collection().doc(id).get();
    return snap.exists ? firestoreDataToEvent(snap.data()!) : null;
  }

  async getBySlug(slug: string): Promise<Event | null> {
    if (!this.useFirestore()) {
      const found = [...this.localFallback.values()].find((event) => event.slug === slug);
      return found ? this.clone(found) : null;
    }
    const query = await this.collection().where("slug", "==", slug).limit(1).get();
    return query.empty ? null : firestoreDataToEvent(query.docs[0].data());
  }

  async listPublished(): Promise<Event[]> {
    const events = await this.allEvents();
    return events
      .filter((event) => event.status !== "cancelled")
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async listAll(): Promise<Event[]> {
    const events = await this.allEvents();
    return events.sort((a, b) => a.date.localeCompare(b.date));
  }

  async findByTicketCode(code: string): Promise<{ event: Event; ticket: Ticket } | null> {
    const upper = String(code ?? "").trim().toUpperCase();
    return this.findTicket((ticket) => ticket.code === upper);
  }

  async findByTicketId(ticketId: string): Promise<{ event: Event; ticket: Ticket } | null> {
    return this.findTicket((ticket) => ticket.id === ticketId);
  }

  private async findTicket(
    predicate: (ticket: Ticket) => boolean,
  ): Promise<{ event: Event; ticket: Ticket } | null> {
    const events = await this.allEvents();
    for (const event of events) {
      const ticket = event.tickets.find(predicate);
      if (ticket) {
        return { event, ticket };
      }
    }
    return null;
  }

  private async allEvents(): Promise<Event[]> {
    if (!this.useFirestore()) {
      return [...this.localFallback.values()].map((event) => this.clone(event));
    }
    // Traer todo y filtrar en memoria: el volumen de Fama (una discoteca) no justifica índices
    // compuestos de Firestore para filtrar por status o buscar dentro de tickets[].
    const query = await this.collection().get();
    return query.docs.map((doc: QueryDocumentSnapshot) => firestoreDataToEvent(doc.data()));
  }

  private collection(): CollectionReference {
    return getFirestore().collection(COLLECTION);
  }

  private useFirestore(): boolean {
    const ok = hasFirebaseCredentials();
    if (!ok && !this.warned) {
      this.warned = true;
      console.warn(
        "[FirestoreEventContract] No hay credenciales de Firebase en .env — usando un " +
          "almacén en memoria del proceso (los datos se pierden al reiniciar). Completa " +
          "FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY en server/.env para usar Firestore real.",
      );
    }
    return ok;
  }

  private clone(event: Event): Event {
    return {
      ...event,
      stages: event.stages.map((stage) => ({ ...stage })),
      tickets: event.tickets.map((ticket) => ({
        ...ticket,
        scans: ticket.scans.map((scan) => ({ ...scan })),
      })),
    };
  }
}
