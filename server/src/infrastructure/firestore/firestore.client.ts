import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore as getAdminFirestore, type Firestore } from "firebase-admin/firestore";

/** true si las 3 variables de Firebase están presentes en el entorno. */
export function hasFirebaseCredentials(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );
}

let app: App | undefined;

/**
 * Devuelve el cliente de Firestore. Lanza si no hay credenciales configuradas —
 * usa `hasFirebaseCredentials()` antes de llamarla para decidir si hay que usar
 * un almacén alterno (ver `FirestoreEventContract`).
 */
export function getFirestore(): Firestore {
  if (!app) {
    if (!hasFirebaseCredentials()) {
      throw new Error(
        "Faltan las credenciales de Firebase (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, " +
          "FIREBASE_PRIVATE_KEY). Complétalas en server/.env — mira server/.env.example.",
      );
    }
    const existing = getApps();
    app = existing.length
      ? existing[0]!
      : initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
          }),
        });
  }
  return getAdminFirestore(app);
}
