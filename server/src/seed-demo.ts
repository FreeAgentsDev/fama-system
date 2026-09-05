/**
 * Seed de demo — crea las 3 noches reales de Fama y genera ventas para que la demo
 * no se vea en ceros.
 *
 *   pnpm start          # en otra terminal
 *   pnpm seed           # carga las 3 fechas + ventas
 *
 * En local el store es un Map en memoria (sin credenciales de Firestore), así que hay que
 * volver a correrlo después de cada reinicio del server. Con Firestore configurado los
 * eventos quedan persistidos y este script se corre una sola vez.
 *
 * Las ventas se generan por el camino real: reserve-ticket y luego confirm-payment con el
 * mismo internalSecret que usa el webhook de Wompi. No se escribe nada "a mano" en el store.
 *
 * Los precios son LO QUE RECIBE DANIEL: el sistema le suma la comisión de Wompi para
 * calcular el precio público (ver WOMPI_FEE_RATE en event.entity.ts).
 */

import { loadEnv } from "./load-env";
loadEnv();

const IRACA_URL = process.env.IRACA_URL ?? "http://localhost:2436";
const INTERNAL_SECRET = process.env.INTERNAL_WEBHOOK_SECRET ?? "";

/** Cupo por etapa. La propuesta habla de aforo real, pero para la demo 20 se lee de un vistazo. */
const CAPACITY = 20;

interface StageInput {
  name: string;
  price: number;
  capacity: number;
}

interface EventInput {
  name: string;
  slug: string;
  date: string;
  venue: string;
  coverImageUrl: string;
  stages: StageInput[];
  /** Cuántas boletas vender por etapa, en orden. Simula el nivel de ocupación de la demo. */
  sales: number[];
}

const NAMES = [
  "Valentina Osorio", "Santiago Ramírez", "Mariana Duque", "Juan David Gómez",
  "Laura Restrepo", "Sebastián Cardona", "Isabella Vélez", "Andrés Felipe Ruiz",
  "Camila Arango", "Nicolás Betancur", "Sofía Mejía", "Tomás Ocampo",
  "Daniela Zuluaga", "Emmanuel Salazar", "Antonia Grisales", "Samuel Hoyos",
  "Luciana Marín", "Martín Estrada", "Gabriela Londoño", "Alejandro Trujillo",
];

const events: EventInput[] = [
  {
    // Casi lleno: 17/20 en preventa. Muestra urgencia real en la página pública.
    name: "Precupido",
    slug: "precupido",
    // Fechas movidas a futuro: las originales de la propuesta (agosto) ya pasaron.
    date: "2026-09-12T22:00:00-05:00",
    venue: "Fama MZL",
    coverImageUrl: "/eventos/precupido.png",
    stages: [
      { name: "Preventa", price: 15000, capacity: CAPACITY },
      { name: "Puerta", price: 20000, capacity: CAPACITY },
    ],
    sales: [17, 0],
  },
  {
    // Término medio, y de paso demuestra "el precio sube solo": la 1.ª etapa se agota
    // y la venta pasa sola a la 2.ª.
    name: "Love House Session",
    slug: "love-house-session",
    date: "2026-09-19T21:00:00-05:00",
    venue: "Fama MZL",
    coverImageUrl: "/eventos/love-house.png",
    stages: [
      { name: "1.ª etapa", price: 40000, capacity: CAPACITY },
      { name: "2.ª etapa", price: 50000, capacity: CAPACITY },
      { name: "3.ª etapa", price: 60000, capacity: CAPACITY },
    ],
    sales: [20, 6, 0],
  },
  {
    // Vacío: recién publicado, nadie ha comprado.
    name: "Girls Power",
    slug: "girls-power",
    date: "2026-09-26T21:00:00-05:00",
    venue: "Fama MZL",
    coverImageUrl: "/eventos/girls-power.png",
    stages: [
      { name: "Preventa", price: 15000, capacity: CAPACITY },
      { name: "Sitio", price: 20000, capacity: CAPACITY },
    ],
    sales: [0, 0],
  },
];

function eventNameOf(body: unknown): string {
  const code = (body as { meta?: { code?: string } })?.meta?.code ?? "";
  return code.split(":").pop() ?? "sin-code";
}

async function call<T>(
  path: string,
  body?: unknown,
  method: "GET" | "POST" = "POST",
): Promise<{ name: string; data: T }> {
  const response = await fetch(`${IRACA_URL}${path}`, {
    method,
    headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
    body: method === "POST" ? JSON.stringify(body) : undefined,
  });
  const parsed = (await response.json()) as { data: T };
  return { name: eventNameOf(parsed), data: parsed.data };
}

function phoneFor(index: number): string {
  return `30${String(10000000 + index * 137).slice(0, 8)}`;
}

async function sellOne(eventId: string, buyerIndex: number): Promise<boolean> {
  const reserved = await call<{ ticket?: { id: string } }>("/events/reserve-ticket", {
    eventId,
    attendeeName: NAMES[buyerIndex % NAMES.length],
    phone: phoneFor(buyerIndex),
  });
  const ticketId = reserved.data?.ticket?.id;
  if (!ticketId) {
    console.log(`   · reserva rechazada → ${reserved.name}`);
    return false;
  }
  const paid = await call("/events/confirm-payment", {
    paymentReference: ticketId,
    wompiTransactionId: `demo-${ticketId}`,
    status: "approved",
    internalSecret: INTERNAL_SECRET,
  });
  if (paid.name !== "TicketPaymentConfirmedDomainEvent") {
    console.log(`   · pago no confirmado → ${paid.name}`);
    return false;
  }
  return true;
}

async function main(): Promise<void> {
  if (!INTERNAL_SECRET) {
    console.error("Falta INTERNAL_WEBHOOK_SECRET en server/.env — sin él no se pueden confirmar pagos.");
    process.exit(1);
  }

  // create-event no valida que el slug sea único, así que correr el seed dos veces contra
  // el mismo server dejaba la cartelera con cada noche duplicada (y /[slug] resolviendo a
  // cualquiera de las dos). Como el HANDOFF pide re-sembrar después de cada reinicio, es
  // fácil correrlo de más justo antes de una demo. Saltamos lo que ya existe.
  const existing = await call<Array<{ slug?: string }>>("/events/list-events", undefined, "GET");
  const existingSlugs = new Set(
    Array.isArray(existing.data) ? existing.data.map((event) => event.slug) : [],
  );

  let buyerIndex = 0;
  for (const event of events) {
    if (existingSlugs.has(event.slug)) {
      console.log(`• ${event.name} → ya existe, no se toca (reinicia el server para empezar de cero)`);
      continue;
    }
    const created = await call<{ id?: string }>("/events/create-event", event);
    if (created.name !== "EventCreatedDomainEvent" || !created.data?.id) {
      console.log(`✗ ${event.name} → ${created.name}`);
      continue;
    }
    const total = event.sales.reduce((sum, n) => sum + n, 0);
    let sold = 0;
    for (let i = 0; i < total; i++) {
      if (await sellOne(created.data.id, buyerIndex++)) {
        sold++;
      }
    }
    const capacity = event.stages.reduce((sum, stage) => sum + stage.capacity, 0);
    console.log(`✓ ${event.name} → ${sold}/${capacity} boletas vendidas`);
  }
  console.log(`\nListo. Abre ${process.env.WEB_URL ?? "http://localhost:3000"}`);
}

main().catch((error) => {
  console.error("No se pudo sembrar la demo:", error);
  process.exit(1);
});
