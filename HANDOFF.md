# Fama System — estado del trabajo (handoff)

Contexto para continuar el desarrollo. Última actualización: 5 sep 2026.

## ✅ Bug del pago — RESUELTO (5 sep, sesión de la tarde)

**Síntoma:** al hacer clic en "Apartar mi boleta" el pago se quedaba cargando para siempre.

**Causa raíz (confirmada, no hipótesis):** el `redirect-url` que le mandábamos a Wompi era
`http://localhost:3000/...`. El WAF de AWS que está delante de `checkout.wompi.co` responde
**403 (CloudFront "Request blocked")** a cualquier request cuyo `redirect-url` apunte a una
dirección local o privada. Medido contra el checkout real, misma llave y misma firma:

| `redirect-url` | Respuesta |
|---|---|
| `http://localhost:3000/…` | **403** |
| `http://127.0.0.1:3000/…` | **403** |
| `http://192.168.1.10:3000/…` | **403** |
| `https://fama-system.vercel.app/…` | 200 |
| `http://lvh.me:3000/…` | 200 |

Con el 403, el iframe del widget carga la página de error de CloudFront en vez del checkout,
así que nunca le reporta su altura al padre y `.waybox-modal` se queda en `height: 0`. Medido
en el DOM: `.waybox-backdrop` 900px (el fondo oscuro que se veía) y `.waybox-modal` **0px**.
Por eso no había ningún error en la consola: el fallo pasa del lado del servidor de Wompi,
dentro del iframe.

**Las tres hipótesis del handoff anterior eran falsas:**

- ❌ *La cuenta sandbox no completó la activación.* No. El checkout renderiza perfecto
  ("MODO DE PRUEBAS", "Pago a freeagents", el monto, y tarjeta / Nequi / DaviPlata / QR
  interoperable / Transferencia Bancolombia). **No hay nada que hacer en comercios.wompi.co.**
- ❌ *Bloqueo de red del navegador (extensión, ad-blocker).* No, es del lado del servidor.
- ❌ *El 403 de CloudFront era por la IP del entorno del agente.* No: era el `localhost` del
  `redirect-url`, exactamente lo mismo que le pasaba a Miguel en su navegador. `widget.js` y
  `/p/` sin `redirect-url` local devuelven 200 desde la misma máquina.

**Arreglo:** `web/lib/checkout-origin.ts` — nunca se manda `window.location.origin` a secas.
En producción sale de `NEXT_PUBLIC_PUBLIC_URL`; en local se reescribe el host a `lvh.me`, un
dominio público que resuelve a 127.0.0.1, así que el WAF lo acepta y el redirect sigue
llegando al `next dev` de siempre.

**Verificado de punta a punta:** navegando en `localhost:3000`, el modal de Wompi abre dentro
de la app (altura 1433px, antes 0) con todos los métodos de pago.

## 🔴 Bloqueador de la demo que sigue abierto: el webhook no llega a localhost

El **único** camino que pasa un ticket de `pending` a `approved` es el POST que Wompi le hace
a `web/app/api/wompi/webhook/route.ts`. Los servidores de Wompi no pueden alcanzar
`localhost:3000` (ni `lvh.me:3000`, que del lado de ellos resuelve a su propia máquina).

Consecuencia: **en una demo 100% local el pago no se puede completar.** El comprador paga, lo
redirige a la boleta, y esa página se queda en "Confirmando tu pago" para siempre.

Para el lunes hay que elegir uno:

1. **Desplegar** (`web` a Vercel + `server` a Railway) — es lo que ya estaba en la lista, y
   deja la demo abrible desde el celular de Daniel. Ver el runbook abajo.
2. **Túnel** (`ngrok http 3000` o `cloudflared`) — expone el localhost con una URL pública.
   Hay que poner esa URL como `NEXT_PUBLIC_PUBLIC_URL` en `web/.env.local` y registrarla como
   URL de eventos en el dashboard de Wompi. Sirve para el lunes sin desplegar nada.

Un camino más robusto para después (no hace falta el lunes): al volver del checkout, Wompi
agrega `id=<transaction_id>` a la URL de redirección. La página de la boleta podría consultar
la transacción contra la API pública de Wompi y confirmar sin depender del webhook. Eso haría
que el flujo funcione incluso en local.

## Deploy — HECHO (5 sep). Falta un paso en el dashboard de Wompi

| Pieza | Dónde | Estado |
|---|---|---|
| `web/` | Vercel → **https://fama.freeagentsdev.com** | ✅ vivo (Root Directory = `web`) |
| `server/` | Render free → **https://fama-system.onrender.com** | ✅ vivo (Root Directory = `server`, Docker) |
| Datos | **Firestore** (Spark, gratis) | ✅ persisten entre spin-downs |

Verificado el 5 sep, en producción: home, `/girls-power` y `/admin/*` responden 200; el
webhook devuelve **401 "invalid signature"** ante un POST sin firma (si le faltaran variables
daría 500, así que están bien puestas); y el modal de Wompi abre en el dominio real con
`redirect-url=https://fama.freeagentsdev.com/...`, la firma de integridad presente y el monto
correcto. Datos de demo sembrados.

**Webhook registrado y verificado de punta a punta** (5 sep). Se reservó una boleta, se mandó
un evento `transaction.updated` **con firma válida** a
`https://fama.freeagentsdev.com/api/wompi/webhook`, y el resultado fue: `200 {"ok":true}` →
ticket `approved` en Firestore con el `paymentRef` actualizado → la página de la boleta
renderiza el QR. Eso prueba de una sola pasada la firma de eventos, que Vercel alcanza a
Render, que el `INTERNAL_WEBHOOK_SECRET` coincide en ambos, y que confirm-payment escribe a
Firestore.

Ojo: fue un evento **simulado**, no una tarjeta real pasando por el checkout de Wompi. La
plomería está probada; falta hacer una compra real de sandbox al menos una vez.

Quedó un ticket de prueba a nombre de **"Prueba Webhook"** en Girls Power. Se puede anular
desde el panel (botón "Anular") si estorba en la demo.

### Notas del deploy que cuesta re-descubrir

- **Iraca no lee `process.env.PORT`.** El puerto salía fijo de `iraca.config.json`, y el
  runner le da prioridad al del JSON sobre el que se le pasa a `runIraca`
  (`if (portInIraca) port = Number(portInIraca)`). Por eso ese campo se sacó del JSON y el
  valor se resuelve en `src/index.ts` con 2436 de respaldo. Render asignó el 10000.
- **`pnpm start` usa `--transpile-only`.** En la instancia free (0.1 CPU, 512 MB) el
  type-check en cada arranque hacía el cold start eterno. Los tipos se siguen verificando en
  `pnpm test`, `tsc --noEmit` y `pnpm dev`.
- **`IRACA_URL` en el server no sirve para nada** — sólo la lee `seed-demo.ts`, que corre en
  la máquina de Miguel. En Vercel sí es necesaria (Next le pega al server desde el servidor).
- **Sembrar producción** desde local:
  ```bash
  cd server && IRACA_URL=https://fama-system.onrender.com \
    INTERNAL_WEBHOOK_SECRET=<el de Render> pnpm seed
  ```
- **`INTERNAL_WEBHOOK_SECRET` tiene que ser idéntico en Render y en Vercel**, o el server
  rechaza todos los pagos por "internalSecret inválido".
- Al importar el `.env` en Vercel, las variables que ya existían **se saltan, no se
  actualizan** — hay que sobrescribirlas a mano.

### Firestore — conectado (5 sep)

Proyecto `fama-system`, colección `events`. Las 3 variables (`FIREBASE_PROJECT_ID`,
`FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) están en Render. La llave privada va en una
sola línea con los `\n` literales, tal como viene en el JSON de la cuenta de servicio — el
cliente hace `privateKey.replace(/\\n/g, "\n")`.

Verificado consultando Firestore directamente, no por los logs: los 3 eventos están ahí con
sus tickets. **Ya no hay que re-sembrar**; el seed se corre una sola vez.

**El seed no es idempotente**: correrlo otra vez contra una base que ya tiene los eventos
crearía duplicados. Sólo se corre contra una base vacía.

Lo único que queda del spin-down es el **cold start de ~50 s** en el primer request después
de 15 min sin tráfico. Para la demo: abrir la URL un par de minutos antes.

### Pendiente de seguridad

La llave de servicio de Firebase que está hoy en Render quedó expuesta en una captura de
pantalla durante la sesión. Hay que **rotarla**: Configuración del proyecto → Cuentas de
servicio → generar una nueva, actualizar las 3 variables en Render, y borrar la vieja desde
Google Cloud Console.

## Qué es esto

Boletería virtual para **Fama MZL** (discoteca en Manizales), cliente **Daniel**.

- `server/` — backend Iraca (Node/TypeScript) + Firestore → **Render free**, en
  https://fama-system.onrender.com (Railway se descartó: ya no tiene capa gratis real —
  trial de $5 por 30 días y después $1/mes de crédito, que no sostiene nada prendido)
- `web/` — frontend Next.js 16: público, admin y scanner de puerta → Vercel, en
  **https://fama.freeagentsdev.com** (dominio provisional hasta que Daniel pague uno propio)

**Alcance contratado:** la propuesta (github.com/m1gue21/fama-propuesta, `docs/PROPUESTA-DANIEL.md`,
pública) tiene 3 piezas acumulativas. Daniel eligió la **pieza 2 "La boleta": $2.500.000 de
armado + $250.000/mes** a partir del día 60. Incluye: publicación de fechas, etapas de precio
("el precio sube solo"), pasarela Wompi, boleta digital con QR y control de puerta.
La pieza 3 (mesas y clientes, +$1.500.000) **no** está contratada — no construir eso.

**Nota comercial:** Daniel todavía no ha pagado nada. El objetivo inmediato es una demo
convincente el **lunes** para pedirle el primer pago. Ver "Plan comercial para el lunes" abajo
— no es solo una nota, es contexto que debería informar qué se prioriza de acá a esa fecha.

**Regla de negocio clave:** el precio que se carga en una etapa es **lo que recibe Daniel**.
El sistema le suma la comisión de Wompi (`WOMPI_FEE_RATE` en `event.entity.ts`) para calcular
el precio público. El comprador absorbe la comisión, no el venue.

## Cómo levantarlo

```bash
cd server && pnpm install && pnpm start   # :2436
cd web    && pnpm dev                     # :3000
cd server && pnpm seed                    # 3 eventos reales + ventas de demo
cd server && pnpm test                    # 53 tests
```

- Panel admin: `http://localhost:3000/admin/eventos` — PIN en `web/.env.local` (`FAMA_ADMIN_PIN`, local = `1234`).
  Ojo: **`/admin` a secas da 404**, no hay página índice. Rutas reales: `/admin/eventos`, `/admin/salas`, `/admin/login`.
- Explorador de endpoints: `http://localhost:2436/docs` (y `/docs.json`).
- Sin credenciales de Firebase, el store es un **`Map` en memoria**: los datos se pierden en
  cada reinicio del server. Por eso hay que volver a correr `pnpm seed` después de reiniciar.
- `server/.env` y `web/.env.local` ya tienen las llaves sandbox de Wompi (cuenta de pruebas
  propia de Miguel, no la de Daniel — así se hace a propósito, ver doc de Wompi:
  sandbox y producción son ambientes completamente separados).

## Plan comercial para el lunes (contexto, no código)

- **Objetivo:** demo en vivo + pedir el primer pago.
- **Anticipo recomendado:** 50% ahora ($1.250.000), 50% restante contra el go-live real en
  producción (no en sandbox). El mensual de $250.000 arranca a los 60 días — falta acordar
  con Daniel desde cuándo cuentan esos 60 días (¿desde el anticipo? ¿desde el go-live?).
- **Confirmado con la doc oficial de Wompi** (`docs.wompi.co`), no adivinado:
  - Wompi vs Bold en la propuesta era un "o": con Wompi solo, la promesa **sí se cumple**.
  - **Bre-B no se puede ofrecer todavía para cobrar** — Wompi no lo tiene en su lista de
    métodos de pago de transacciones (`/docs/colombia/metodos-de-pago/`). Lo único que
    existe con ese nombre está marcado "Próximamente" y es para *pagar a terceros*
    (dispersiones), un producto totalmente distinto. Hay que decírselo a Daniel tal cual:
    limitación de Wompi, no nuestra.
  - PSE, Nequi, tarjeta y botón de Transferencia Bancolombia **sí están disponibles**.
  - La propuesta promete que pagar con Nequi/Bre-B es "sin cargo de pasarela" — **hoy el
    sistema cobra la comisión de Wompi a todos por igual**, sin importar el método elegido
    (el precio se fija antes de que el comprador escoja cómo paga en el widget). Cumplirlo
    de verdad requiere saber el método antes de calcular el precio — no es trivial. Pendiente
    de decidir con Daniel: ¿se ajusta el alcance, o se construye después?
- **Carritos abandonados:** Daniel pidió esto y Miguel ya dijo que sí — no estaba en la
  propuesta original, pero se decidió incluirlo en el precio ya cotizado (no cobrar aparte).

## Sesión del 5 sep — hecho

### 1. Carritos abandonados (visibilidad + recordatorio manual)
Nada de API de Meta, nada automático — coherente con el resto del sistema. En
`web/components/admin/event-detail.tsx`:
- Tarjeta "Carritos abandonados" en el admin de cada evento: tickets `pending` con más de
  12 min (`ABANDONED_CART_MINUTES`), con hace cuánto y botón "Recordar" que abre WhatsApp
  con un mensaje ya escrito.
- 100% frontend, no toca el backend de pagos.

**Bug de fondo que esto dejó al descubierto, sin arreglar todavía:** un ticket `pending`
ocupa el cupo de la etapa desde que se reserva, no desde que se paga (`issueTicket` sube
`stage.soldCount` de una vez). Si alguien abandona el carrito sin que Wompi mande ni
`APPROVED` ni `DECLINED`, ese cupo queda perdido para siempre — nadie lo libera. Con tráfico
real esto hace que una etapa se muestre "agotada" sin estarlo. Arreglarlo bien es tocar el
dominio de pagos; no se hizo por prudencia justo antes de la demo. **Hay que resolverlo antes
de que Daniel reciba pagos reales.** `rejectPayment()` en `event.entity.ts` ya tiene la lógica
de liberar cupo (se usa cuando Wompi manda `DECLINED`) — la solución más simple es una
expiración diferida que reuse ese mismo mecanismo cuando un `pending` pasa de cierto tiempo,
llamada de forma perezosa desde `reserve-ticket`/`list-events` (sin necesitar un cron).

### 2. Reenviar boleta pagada por WhatsApp
La boleta (`web/app/[slug]/boleta/[ticketId]/page.tsx`) decía *"también te lo enviamos por
WhatsApp"* sin que fuera cierto — el link `wa.me` se calculaba en el backend
(`ticketWhatsAppLink` en `event.entity.ts`) pero nadie lo usaba. Arreglado con dos piezas:
- Comprador: botón "Enviarme el link por WhatsApp" (`web/components/public/whatsapp-send-button.tsx`),
  usa `wa.me/?text=...` **sin número** (el endpoint público no expone el teléfono a
  propósito) — abre WhatsApp y la persona elige a quién mandárselo.
- Admin: botón "Reenviar" junto a cada comprador confirmado en `event-detail.tsx`, sí usa el
  teléfono (vista autenticada).

**Pendiente sin tocar:** en la página de compra del evento (`/[slug]`) todavía dice "Recibe
tu QR por WhatsApp" en el paso 3 — misma promesa, mismo lugar sin resolver, no se llegó a
revisar esta sesión.

### 3. Dos bugs reales de la pasarela (encontrados al tener llaves reales por primera vez)
1. **Firma de integridad de Wompi nunca se mandaba.** `WOMPI_INTEGRITY_SECRET` estaba en
   `.env.example` pero no se usaba en ningún lado. Sin ella, cuentas configuradas para
   exigirla rechazan el pago. Agregado `wompiIntegritySignature()` en `event.entity.ts`
   (con test que reproduce **exacto** el ejemplo oficial de la doc de Wompi), calculada en
   `reserve-ticket.usecase-impl.ts` y mandada desde `wompi-checkout-button.tsx`.
2. **`checkout.open()` se llamaba sin argumentos.** El widget de Wompi exige una función de
   respuesta — sin ella tira `"Debes especificar una función de respuesta"` y **nunca abre,
   para nadie**, ni antes de esta sesión. No se pudo detectar antes porque sin llave sandbox
   el código nunca llegaba a esa línea. Arreglado pasando un callback mínimo (solo loguea,
   la navegación real la hace `redirectUrl` y la confirmación real el webhook).

Verificado: 48/48 tests del server pasan (incluye el nuevo de la firma), `tsc`/`eslint`
limpios en `server/` y `web/`. La URL final generada del checkout se armó y se comparó a
mano — coincide en cada parámetro.

### 4. Deploy a Vercel — hecho, con 404 a resolver
Miguel ya corrió el deploy (`fama-system.vercel.app`). Daba **404 de plataforma** (Vercel,
no de la app — CloudFront/Vercel edge, no Next.js). Diagnóstico: este es un monorepo
(`server/` + `web/`, sin `package.json` en la raíz) y Vercel necesita que **Root Directory**
esté puesto en `web` (Settings → General). Además faltan las env vars de producción
(`IRACA_URL`, `NEXT_PUBLIC_IRACA_URL`, `FAMA_ADMIN_PIN`, `ADMIN_SESSION_SECRET`, llaves de
Wompi) en Settings → Environment Variables — y ojo, `IRACA_URL` no puede seguir apuntando a
`localhost:2436`, necesita el backend desplegado en algún lado (Railway, según el README).
**No confirmado si ya se corrigió** — revisar esto antes que nada más de infraestructura.

### Archivos tocados hoy
```
M server/src/features/events/domain/event.entity.ts          (wompiIntegritySignature)
M server/src/features/events/domain/event.entity.test.ts     (test contra ejemplo oficial Wompi)
M server/src/features/events/domain/event.events.ts          (wompiSignature en TicketReservedDomainEvent)
M server/src/features/events/usecases/reserve-ticket.usecase-impl.ts
M server/src/features/events/usecases/reserve-ticket.usecase.ts
M web/app/[slug]/boleta/[ticketId]/page.tsx                   (copy honesto + botón WhatsApp)
M web/components/admin/event-detail.tsx                       (carritos abandonados + reenviar)
M web/components/wompi-checkout-button.tsx                    (firma + callback de open())
M web/lib/api.ts                                               (wompiSignature en ReservedTicket)
? web/components/public/whatsapp-send-button.tsx               (nuevo)
M server/.env, web/.env.local                                  (llaves sandbox — NO commiteadas)
```

## Sesión del 5 sep (tarde) — hecho

1. **Bug del pago resuelto** — ver la sección de arriba. `web/lib/checkout-origin.ts` (nuevo)
   + un cambio de una línea en `wompi-checkout-button.tsx`.
2. **Bug de capacidad de carritos abandonados — arreglado.** `expireStalePendingTickets()` y
   `PENDING_TICKET_TTL_MINUTES = 30` en `event.entity.ts`, con el helper
   `usecases/release-stale-holds.ts` llamado de forma perezosa desde `reserve-ticket`,
   `get-event-by-slug` y `list-events`. Sin cron: el cupo se recupera la próxima vez que
   alguien mire el evento. Los 30 min son mayores que los 12 de `ABANDONED_CART_MINUTES`
   para que Daniel alcance a mandar el recordatorio antes de que el cupo se libere.
   `confirmPayment()` ahora **recupera** un ticket que ya había expirado si el APPROVED de
   Wompi llega tarde (se prefiere sobrevender una boleta antes que cobrar y no entregar).
3. **Copy honesto en `/[slug]`**: el paso 3 decía "Recibe tu QR por WhatsApp" sin que hubiera
   envío automático. Ahora dice "Recibe tu QR al instante"; el botón de WhatsApp sigue estando
   en la página de la boleta.

Verificado: **53/53 tests** del server (5 nuevos de expiración), `tsc` limpio en `server/` y
`web/`, `eslint` limpio en `web/`. Ojo: `server/` **no tiene** script de lint, al contrario de
lo que decía el handoff anterior.

## Pendientes heredados de sesiones anteriores (sin resolver todavía)

- **Flyers con fecha vieja impresa** ("13 de Agosto" en Precupido) — Miguel decidió que esto
  espera, no es prioridad para el lunes.
- **`Bold`** aparece en la propuesta pero no está implementado — ya resuelto conceptualmente
  (Wompi solo cumple la promesa, era un "o"), no hace falta construirlo.
- **No hay tests en `web/`**, solo en `server/`. El webhook de Wompi
  (`app/api/wompi/webhook/route.ts`) es lo más crítico sin cubrir.
- **La promesa de "Nequi/Bre-B sin cargo de pasarela"** de la propuesta sigue sin cumplirse:
  hoy se cobra la comisión a todos por igual. Pendiente de decidir con Daniel.

## Cosas que ya están bien (no romper)

La seguridad está sólida y revisada: firma de Wompi con `timingSafeEqual`, sesión de admin por
PIN con HMAC (el PIN nunca va en la cookie), comparaciones en tiempo constante, y el cliente
`lib/iraca-server.ts` es server-only a propósito para que el navegador nunca llame endpoints de
admin directo. El webhook tiene tests de idempotencia y de liberación de cupo cuando un pago se
rechaza. Los dos "trampas de Next 16" (hidratación de fechas en `lib/format.ts`, `Date.now()`
fuera del render en `lib/salas.ts`) siguen resueltas — no reintroducirlas.

Historial completo de sesiones anteriores (edición de eventos, slug único, control de puerta,
salas en vivo, verificación por roles) queda en el historial de git de este archivo —
recórtalo de acá si hace falta espacio, pero no hace falta repetirlo en cada handoff nuevo.
