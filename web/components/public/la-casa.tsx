import { FAMA, FAMA_TAGLINE } from "@/lib/fama";

/**
 * Nada de esta sección está inventado: sale de la propuesta — Fama es "una casa en Milán:
 * puerta, barra y cocina", y su voz es "Tragos con alma, noches con historia". No se afirma
 * nada que no esté confirmado por el cliente (ni años, ni aforo, ni premios).
 */
const PILARES = [
  {
    titulo: "Puerta",
    texto: "Aparta desde el celular y entra con tu QR. Sin filas, sin listas en papel.",
  },
  {
    titulo: "Barra",
    texto: "Coctelería de autor y botella para la mesa. Tragos con alma, no de catálogo.",
  },
  {
    titulo: "Cocina",
    texto: "Para que la noche aguante. Se come bien y se sigue.",
  },
];

export function LaCasa() {
  return (
    <section id="la-casa" className="scroll-mt-24 py-20">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-14">
        <div>
          <p className="fama-kicker">La casa</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Una casa en {FAMA.neighborhood}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-white/70">
            Fama no es un evento suelto. Es un lounge en {FAMA.city}: neón, sonido y noches
            que se arman de verdad.
          </p>
          <p className="fama-logo mt-8 text-3xl sm:text-4xl">{FAMA_TAGLINE}</p>
        </div>

        <ul className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          {PILARES.map((pilar) => (
            <li key={pilar.titulo} className="fama-card p-5">
              <p className="fama-kicker">{pilar.titulo}</p>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{pilar.texto}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
