import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEvent, issueTicket } from "../domain/event.entity";
import { eventToFirestoreData, firestoreDataToEvent } from "./firestore-event.mapper";

describe("firestore-event.mapper", () => {
  it("round-trip: serializar y deserializar preserva el agregado completo", () => {
    const evt = createEvent({
      name: "Love House Session",
      date: new Date("2026-09-15T22:00:00.000Z"),
      stages: [{ name: "Preventa", price: 20000, capacity: 5 }],
    });
    const issued = issueTicket(evt, "Ana Restrepo", "3001234567");
    assert.equal(issued.ok, true);
    if (!issued.ok) return;

    const data = eventToFirestoreData(issued.event);
    // Debe ser un objeto plano serializable (sin funciones, sin clases, sin `undefined`).
    assert.doesNotThrow(() => JSON.stringify(data));

    const rebuilt = firestoreDataToEvent(data);
    assert.deepEqual(rebuilt, issued.event);
  });

  it("preserva un coverImageUrl ausente como undefined, no como null", () => {
    const evt = createEvent({
      name: "Charla",
      date: new Date("2026-09-02T20:00:00.000Z"),
      stages: [{ name: "Única", price: 10000, capacity: 1 }],
    });
    const data = eventToFirestoreData(evt);
    const rebuilt = firestoreDataToEvent(data);
    assert.equal(rebuilt.coverImageUrl, undefined);
  });
});
