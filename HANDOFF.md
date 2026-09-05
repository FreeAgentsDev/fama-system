# Fama System — estado del trabajo (handoff)

Contexto para continuar el desarrollo. Última actualización: 4 sep 2026.

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

## Trabajado en la sesión anterior (ya commiteado en `master`)

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

Estado: `tsc --noEmit` limpio, **30/30 tests pasando**. Commiteado en `b0c9f9c`, `e5bc07f` y `da80d8e`.


## Pendientes

### Verificación por roles — HECHA (4 sep)

Barrido completo con los datos del seed, server y web levantados. Todo lo de abajo
se probó de verdad, no por lectura de código:

| Superficie | Resultado |
|---|---|
| Cartelera `/` | ✅ 3 eventos, flyers, etapa y precio correctos |
| Evento `/[slug]` | ✅ precio público, "Quedan 3 boletas a este precio" (20−17) |
| Boleta `/[slug]/boleta/[id]` | ✅ QR PNG 320×320 renderiza, nombre, etapa y código |
| Scanner `/puerta` | ✅ admite por código manual; backend pasó a `inside:1, entries:1` |
| Sala en vivo `/admin/sala` | ✅ SSE en vivo: contador 1→2 y "Santiago Ramírez entró" sin recargar |
| Admin `/admin/eventos` | ✅ PIN, listado, vendidos y recaudo correctos |
| Detalle + CSV | ✅ CSV real capturado: 18 líneas, comillas escapadas, estado "Adentro" |
| Ocultar / Publicar | ✅ round-trip completo |

**Bug nuevo encontrado y arreglado (`9e0d99f`):** la cartelera y la descripción
OpenGraph mostraban `currentStage.price` (lo que recibe Daniel) en vez de
`publicPrice` (lo que paga el comprador). Se veía "Desde $15.000" en la cartelera y
al compartir el link, y $15.448 al pagar. Ahora ambas usan `publicPrice`.

### Bugs sospechados — resueltos

- ~~`listPublished()` no filtra ocultos~~ → **falsa alarma.** `hideEvent()` pone
  `status: "cancelled"`, y el filtro `status !== "cancelled"` es justo lo que lo
  saca de la cartelera. Verificado: al ocultar, el evento desaparece de `/`, y
  entrar directo a `/[slug]` muestra "Este evento ya no está disponible" sin botón
  de compra. `EventStatus` no necesita un estado "hidden" nuevo.
- ~~`page.tsx` traga errores~~ → **arreglado** (`9e0d99f`). Distingue cartelera
  vacía de fallo de carga y loguea el error. Verificado levantando el web contra un
  backend muerto: muestra "No pudimos cargar la cartelera".
- ~~`revalidate` + `no-store`~~ → **arreglado** (`9e0d99f`). Confirmado en los docs
  de Next 16 (`02-guides/caching-without-cache-components.md`): un fetch con
  `no-store` fuerza render dinámico y el `revalidate` del segmento no lo pisa. Era
  configuración muerta; se quitó de `page.tsx` y de `[slug]/page.tsx`.

### Correcciones a este documento

- El botón de Wompi **sí renderiza** sin `NEXT_PUBLIC_WOMPI_KEY`; falla al hacer
  clic con "Falta configurar NEXT_PUBLIC_WOMPI_KEY". No bloquea la demo visual.
- El script del widget (`checkout.wompi.co/widget.js`) **ya está** cargado en
  `app/layout.tsx:36` y `window.WidgetCheckout` carga bien. Lo único que falta es
  la llave.

### Faltantes para producción

- **`NEXT_PUBLIC_WOMPI_KEY` (`pub_test_…`) en `web/.env.local`** — es lo único que
  falta para probar el pago end-to-end. Todo lo demás del checkout está listo.
- Wompi está en **sandbox**; falta pasar a llaves productivas (requiere aprobación
  de Daniel).
- **Bold** aparece en la propuesta pero **no está implementado** (solo Wompi).
  Confirmar con Daniel si entra en el alcance o se aclara que quedó fuera.
- Credenciales de Firestore para que los datos persistan (`FIREBASE_PROJECT_ID`,
  `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`). Sin ellas hay que re-correr
  `pnpm seed` en cada reinicio del server.
- **No hay tests en `web/`**, solo en `server/`. El webhook de Wompi
  (`app/api/wompi/webhook/route.ts`) es lo más crítico.
- **`create-event` no valida que el slug sea único.** Se descubrió porque correr
  `pnpm seed` dos veces duplicaba las 3 noches en la cartelera. El seed ya se
  protege (`3c7b538`), pero el hueco sigue en el dominio: Daniel puede crear dos
  eventos con el mismo slug desde el admin y `/[slug]` resolvería a cualquiera de
  los dos. Falta un `EventSlugTakenDomainEvent` y su manejo en el form del admin.
- Desplegar: server a Railway, web a Vercel, con dominio para la demo.

### Pulido menor — hecho

- ~~"1 PERSONAS ADENTRO"~~ → singular arreglado.
- ~~Error de cámara en inglés~~ → `/puerta` traduce los errores de `getUserMedia`
  por nombre (`NotAllowedError`, `NotFoundError`, `NotReadableError`) y cada uno
  dice qué hacer.
- **Pendiente:** los flyers son los originales de la propuesta y traen la fecha
  vieja impresa ("13 de Agosto" en Precupido) mientras el texto dice 12 de
  septiembre. No se arregla desde el código: hay que regenerar las imágenes.
  Daniel lo va a notar en la demo.

## Ampliación del admin (4 sep)

### Edición de eventos
`updateEvent()` en el dominio + `UpdateEventUsecase` (`POST /events/update-event`) y
`/admin/eventos/[id]/editar`. Se editan nombre, enlace, fecha, sede, flyer y etapas.

Lo que **no** se puede hacer, y por qué —cualquiera de las dos dejaría boletas
emitidas sin respaldo:
- quitar una etapa que ya vendió
- dejarle a una etapa un cupo menor a lo que ya vendió

El `pricePaid` de quien ya compró nunca se toca: vive en el ticket, no en la etapa,
así que subir un precio no le recobra nada a nadie. Renombrar una etapa manda
`previousName` y arrastra el nombre a sus tickets — sin eso, un renombre se vería
como borrar+crear y perdería el `soldCount`. Un evento oculto sigue oculto después
de editarlo.

El formulario aplica las mismas reglas antes de enviar (cupo mínimo, botón de quitar
bloqueado) y el server las valida igual.

### Slug único
`EventSlugTakenDomainEvent` en create y en update. Era el hueco anotado antes: el
slug es la URL pública, y repetido hacía que `/[slug]` resolviera a cualquiera de las
dos noches.

### Control de puerta
- Filtros con conteo: Todos · Adentro · Afuera · Sin entrar · Anuladas. **"Afuera"
  (entró y se fue) y "Sin entrar" (nunca llegó) están separados a propósito:** en la
  puerta no es la misma pregunta.
- "Marcar entrada"/"Marcar salida" a mano, para cuando el QR no se deja leer. Va por
  el mismo `scan-ticket` que la puerta con `gate: "admin"`, así queda registrado con
  hora y origen y la sala en vivo se entera igual.
- Historial de movimientos por boleta, con hora y si vino de la puerta o del admin.
- El CSV suma `entradas` y `ultimo_movimiento`.

### Salas en vivo
`/admin/salas` (antes `/admin/sala`, que mostraba una noche a la vez en un select).
Todas las noches juntas, en vivo por SSE, y cada tarjeta se adapta a en qué va:

| Fase | Qué muestra |
|---|---|
| En curso | adentro · salieron · sin llegar, barra de ocupación, último movimiento |
| Próxima | vendidas, recaudo, etapa vigente, cupo restante |
| Terminada | **% de asistencia**, cuántos asistieron, cuántos compraron y no llegaron |

Una noche con gente adentro cuenta como "en curso" aunque el reloj diga otra cosa.
Arriba va el total de personas adentro y cuántas salas están activas; abajo, el feed
de movimientos de todas las noches con el evento al que pertenece cada uno.

Para esto `AdminEventSummary` creció con la ocupación (`inside`, `outside`,
`attended`, `neverEntered`, `entries`, `voided`, `remaining`, `lastScanAt`), así el
panel se arma con una sola llamada a `list-events` en vez de pedir el box office de
cada evento.

**Ojo con `outside`:** en el dominio significa "no está adentro", así que incluye a
quien compró y nunca llegó. Para asistencia hay que usar `attended` (entró al menos
una vez); los que entraron y se fueron son `attended - inside`.

### Dos trampas de Next 16 que ya están resueltas
- **Fechas e hidratación.** `Intl.DateTimeFormat` con `timeStyle` mete U+00A0 antes
  de "p. m." en Node y un espacio normal en el navegador — misma locale, misma zona,
  distinta data ICU. En un componente cliente eso rompe la hidratación con dos
  strings que se ven idénticos. `lib/format.ts` normaliza los espacios; úsalo para
  cualquier fecha que se renderice en las dos pasadas.
- **`Date.now()` en render.** La regla `react-hooks/purity` lo rechaza, y con razón.
  El timestamp del server se lee en `lib/salas.ts` (capa de datos) con `connection()`
  para diferirlo a request time; la página solo renderiza lo que recibe.

### Fuera de alcance, a propósito
La **base de clientes cruzada entre eventos** ("quién vino, a qué noche") es tier 3
en la propuesta ($1.500.000, no contratado) y **no se construyó**. Lo que sí está
—porque el tier 2 lo incluye explícitamente— es la lista de quién compró *por evento*
y el control de entradas/salidas.

## Cosas que ya están bien (no romper)

La seguridad está sólida y revisada: firma de Wompi con `timingSafeEqual`, sesión de admin por
PIN con HMAC (el PIN nunca va en la cookie), comparaciones en tiempo constante, y el cliente
`lib/iraca-server.ts` es server-only a propósito para que el navegador nunca llame endpoints de
admin directo. El webhook tiene tests de idempotencia y de liberación de cupo cuando un pago se
rechaza.
