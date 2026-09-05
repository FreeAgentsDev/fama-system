import { FAMA } from "@/lib/fama";

/**
 * Nada de esta sección es inventado. El concepto (bar de los 80, retro-moderno, coctelería
 * de autor y hamburguesas artesanales) y los géneros salen de la ficha pública del lugar;
 * "puerta, barra y cocina" sale de la propuesta. No se afirma antigüedad, aforo ni premios.
 */
const PILARES = [
  {
    titulo: "Puerta",
    texto: "Apartas desde el celular y entras con tu QR. Sin filas y sin listas en papel.",
  },
  {
    titulo: "Barra",
    texto: "Coctelería de autor y botella para la mesa. Tragos con alma, no de catálogo.",
  },
  {
    titulo: "Cocina",
    texto: "Hamburguesas artesanales para que la noche aguante hasta el final.",
  },
];

export function LaCasa() {
  return (
    <section id="la-casa" className="scroll-mt-24 py-20">
      <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-start lg:gap-16">
        <div>
          <p className="fama-kicker">La casa</p>
          <h2 className="fama-neon mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Los 80 siguen sonando en {FAMA.neighborhood || FAMA.city}
          </h2>

          <p className="mt-5 text-lg leading-relaxed text-white/70">{FAMA.concept}</p>

          {FAMA.music.length > 0 && (
            <>
              <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                Lo que suena
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {FAMA.music.map((genero) => (
                  <li key={genero} className="fama-chip">
                    {genero}
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className="fama-logo mt-10 text-3xl sm:text-4xl">Tragos con alma, noches con historia.</p>
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
