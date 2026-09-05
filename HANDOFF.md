# Fama System — estado del trabajo (handoff)

Contexto para continuar el desarrollo. Última actualización: 5 sep 2026.

## Qué es esto

Boletería virtual para **Fama MZL** (discoteca en Manizales), cliente **Daniel**.

- `server/` — backend Iraca (Node/TypeScript) + Firestore → Railway
- `web/` — frontend Next.js 16: público, admin y scanner de puerta → Vercel

**Alcance contratado:** la propuesta (github.com/m1gue21/fama-propuesta, `docs/PROPUESTA-DANIEL.md`)
tiene 3 tiers acumulativos. Daniel eligió el **tier 2 "La boleta": $2.500.000 de armado +
$250.000/mes** a partir del día 60. Incluye: publicación de fechas, etapas de precio
("el precio sube solo"), pasarela Wompi, boleta digital con QR y control de puerta.
El tier 3 (mesas y clientes, +$1.500.000) **no** está contratado — no construir eso.

**Nota comercial:** Daniel todavía no ha pagado nada. El objetivo inmediato es una demo
convincente para pedirle el anticipo.

**Regla de negocio clave:** el precio que se carga en una etapa es **lo que recibe Daniel**.
El sistema le suma la comisión de Wompi (`WOMPI_FEE_RATE` en `event.entity.ts`) para calcular
el precio público. El comprador absorbe la comisión, no el venue.

## Cómo levantarlo

```bash
cd server && pnpm install && pnpm start   # :2436
cd web    && pnpm dev                     # :3000
cd server && pnpm seed                    # 3 eventos reales + ventas de demo
cd server && pnpm test                    # 30 tests
```

- Panel admin: `http://localhost:3000/admin/eventos` — PIN en `web/.env.local` (`FAMA_ADMIN_PIN`, local = `1234`).
  Ojo: **`/admin` a secas da 404**, no hay página índice. Rutas reales: `/admin/eventos`, `/admin/sala`, `/admin/login`.
- Explorador de endpoints: `http://localhost:2436/docs` (y `/docs.json`).
- Sin credenciales de Firebase, el store es un **`Map` en memoria**: los datos se pierden en
  cada reinicio del server. Por eso hay que volver a correr `pnpm seed` después de reiniciar.

## Trabajado en la sesión anterior (sin commitear, rama `master`)

### Bugs encontrados y arreglados

1. **`ListPublishedEventsUsecase` quedaba registrado como POST.** En `events.controller.ts`
   el patrón `/Publish/` hacía match con "List**Publish**edEvents", y como el grupo POST se
   evalúa primero (ver `getMethodToUse` en el helper de Iraca: primer grupo que matchea gana
   y hace `break`), el endpoint quedaba en POST. El front lo llama con GET → 404 → el
   `try/catch` de `web/app/page.tsx` lo convertía en "Aún no hay fechas publicadas" aunque el
   evento estuviera publicado. **Arreglo:** anclar todos los patrones con `^`.

2. **Nada cargaba `server/.env`.** No hay `dotenv` ni `--env-file`, e Iraca no lee archivos
   `.env`. Resultado: `INTERNAL_WEBHOOK_SECRET` llegaba `undefined` y `ConfirmPaymentUsecase`
   rechazaba **todos** los pagos con "internalSecret inválido" en local. En Railway no se nota
   porque la plataforma inyecta las variables. **Arreglo:** `server/src/load-env.ts` con
   `process.loadEnvFile()` (Node 20.12+), sin dependencias nuevas, inocuo en producción.

### Agregado

3. **`/docs` — explorador de endpoints de Iraca.** Portado desde
   `~/Desktop/scifamek/server/src/iraca-explorer` (repo `m1gue21/iraca-practica`, público).
   Lee `controller.httpRoutesTable`, infiere los `DomainEvent` de los `*.usecase-impl.ts` y el
   JSON de ejemplo de las `interface *Param`. Muestra con qué método HTTP quedó cada usecase,
   que es justo lo que costó descubrir el bug 1. Conectado en `server/src/index.ts`. Su test
   (`infer.test.ts`) ya está en el script `test`.

4. **`server/src/seed-demo.ts` (`pnpm seed`)** — crea las 3 noches reales sacadas de
   `fama-propuesta` (`lib/examples.ts`, `fama-admin/lib/seed.ts`), con sus flyers originales ya
   copiados a `web/public/eventos/`. Genera las ventas por el camino real (`reserve-ticket` →
   `confirm-payment` con el mismo `internalSecret` del webhook), nada escrito a mano en el store.
   Cupo 20 por etapa:
   - **Precupido** (12 sep) — casi lleno: 17/20 en preventa
   - **Love House Session** (19 sep) — 1.ª etapa agotada 20/20 + 6 en la 2.ª (demuestra el salto de etapa)
   - **Girls Power** (26 sep) — vacío, recién publicado

   Las fechas originales de la propuesta (agosto) ya pasaron, por eso están movidas a futuro.

### Archivos tocados

```
M server/package.json                                        (scripts test + seed)
M server/src/features/events/infrastructure/events.controller.ts  (bug 1)
M server/src/index.ts                                        (loadEnv + attachIracaExplorer)
? server/src/iraca-explorer/                                 (nuevo, portado)
? server/src/load-env.ts                                     (bug 2)
? server/src/seed-demo.ts                                    (nuevo)
? web/public/eventos/                                        (3 flyers)
```

Estado: `tsc --noEmit` limpio, **30/30 tests pasando**. Nada commiteado todavía.

## Pendientes

### Verificación interrumpida
El barrido por roles quedó a medias. Falta recorrer y validar con datos del seed:
- Cartelera pública `/` y página de evento `/[slug]` (¿se ven los flyers y las etapas?)
- Flujo de compra completo y boleta con QR en `/[slug]/boleta/[ticketId]`
- Scanner de puerta `/puerta` (PWA con `@zxing`)
- Sala en vivo del admin (SSE vía `/stream`) y "Exportar CSV"

### Bugs sospechados, sin confirmar
- **`listPublished()` en `firestore-event.contract.ts` solo filtra `status !== "cancelled"`**,
  no filtra por oculto/publicado. Un evento "Ocultado" desde el admin probablemente **sigue
  saliendo en la cartelera pública**. Verificar y arreglar. `EventStatus` es
  `"published" | "sold-out" | "cancelled"` — no hay estado "hidden", revisar qué hace
  `HideEventUsecase` realmente.
- **`web/app/page.tsx` traga errores** con `catch { events = [] }`, mostrando "no hay fechas"
  ante cualquier fallo de red. Fue lo que escondió el bug 1 — conviene diferenciar
  "no hay eventos" de "no pude cargar".
- `web/app/page.tsx` combina `export const revalidate = 30` con fetches `cache: "no-store"`,
  lo cual es contradictorio en App Router. Revisar.

### Faltantes para producción
- **`NEXT_PUBLIC_WOMPI_KEY` no está en `web/.env.local`** — sin ella el botón de checkout
  (`components/wompi-checkout-button.tsx`) no renderiza. Bloquea probar el pago end-to-end.
- Wompi está en **sandbox**; falta pasar a llaves productivas (requiere aprobación de Daniel).
- **Bold** aparece como método de pago en la propuesta pero **no está implementado** (solo Wompi).
  Confirmar con Daniel si entra en el alcance o se aclara que quedó fuera.
- Credenciales de Firestore para que los datos persistan (`FIREBASE_PROJECT_ID`,
  `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`).
- **No hay tests en `web/`**, solo en `server/`. El webhook de Wompi
  (`app/api/wompi/webhook/route.ts`) es lo más crítico y lo que más duele si falla en producción.
- Desplegar: server a Railway, web a Vercel, con dominio para la demo.

## Cosas que ya están bien (no romper)

La seguridad está sólida y revisada: firma de Wompi con `timingSafeEqual`, sesión de admin por
PIN con HMAC (el PIN nunca va en la cookie), comparaciones en tiempo constante, y el cliente
`lib/iraca-server.ts` es server-only a propósito para que el navegador nunca llame endpoints de
admin directo. El webhook tiene tests de idempotencia y de liberación de cupo cuando un pago se
rechaza.
