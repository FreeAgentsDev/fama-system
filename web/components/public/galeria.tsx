import { GALERIA } from "@/lib/fama";

/**
 * Mosaico de la galería. La primera foto ocupa el doble de alto en escritorio para que la
 * cuadrícula no se lea como una plantilla; en móvil todas van al mismo tamaño.
 */
export function Galeria() {
  if (GALERIA.length === 0) return null;

  return (
    <>
      <hr className="fama-rule" />
    <section id="galeria" className="scroll-mt-24 py-20">
      <p className="fama-kicker">Galería</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Así se ve una noche</h2>

      <div className="mt-8 grid auto-rows-[180px] grid-cols-2 gap-3 sm:auto-rows-[220px] lg:grid-cols-4">
        {GALERIA.map((foto, index) => (
          <figure
            key={foto.src}
            className={`group relative overflow-hidden rounded-2xl border border-white/10 ${
              index === 0 ? "col-span-2 row-span-2" : ""
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- material del cliente, no optimizamos remoto */}
            <img
              src={foto.src}
              alt={foto.alt}
              loading="lazy"
              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
          </figure>
        ))}
      </div>
    </section>
    </>
  );
}
