/**
 * Carga `server/.env` en process.env.
 *
 * Iraca no lee archivos .env y el proyecto no usa dotenv, así que sin esto
 * INTERNAL_WEBHOOK_SECRET, las llaves de Wompi y las credenciales de Firebase llegan
 * `undefined` en local — y ConfirmPaymentUsecase rechaza todos los pagos por
 * "internalSecret inválido".
 *
 * En Railway/Vercel las variables las inyecta la plataforma y este archivo no hace nada
 * (no hay .env en el contenedor), así que es seguro llamarlo siempre.
 *
 * Usa process.loadEnvFile (Node 20.12+ / 22+) para no agregar dependencias.
 */
import { existsSync } from "node:fs";
import path from "node:path";

export function loadEnv(): void {
  const envPath = path.resolve(__dirname, "..", ".env");
  if (!existsSync(envPath)) {
    return;
  }
  const loader = (process as NodeJS.Process & { loadEnvFile?: (p: string) => void }).loadEnvFile;
  if (typeof loader === "function") {
    loader.call(process, envPath);
  } else {
    console.warn("process.loadEnvFile no disponible (Node < 20.12): server/.env no se cargó.");
  }
}
