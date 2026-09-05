import { FAMA, fullAddress, instagramUrl, mapsUrl, whatsappUrl } from "@/lib/fama";

/**
 * Ubicación, horarios y contacto.
 *
 * Cada bloque se muestra sólo si su dato está puesto en `lib/fama.ts`, y la sección entera
 * desaparece si no hay ninguno. Es a propósito: es preferible que no salga a que salga con
 * una dirección o un Instagram inventados.
 */
export function Visitanos() {
  const direccion = fullAddress();
  const mapa = mapsUrl();
  const instagram = instagramUrl();
  const whatsapp = whatsappUrl();
  const tieneHorarios = FAMA.hours.length > 0;

  if (!direccion && !tieneHorarios && !instagram && !whatsapp) return null;

  return (
    <>
      <hr className="fama-rule" />
    <section id="visitanos" className="scroll-mt-24 py-20">
      <p className="fama-kicker">Visítanos</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        Te esperamos en {FAMA.city}
      </h2>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {direccion && (
          <div className="fama-card p-6">
            <p className="fama-kicker">Dónde</p>
            <p className="mt-3 text-lg font-medium">{direccion}</p>
            {mapa && (
              <a
                href={mapa}
                target="_blank"
                rel="noopener noreferrer"
                className="fama-btn-ghost mt-4"
              >
                Cómo llegar
              </a>
            )}
          </div>
        )}

        {tieneHorarios && (
          <div className="fama-card p-6">
            <p className="fama-kicker">Cuándo</p>
            <dl className="mt-3 space-y-2">
              {FAMA.hours.map((horario) => (
                <div key={horario.days} className="flex items-baseline justify-between gap-4">
                  <dt className="text-white/70">{horario.days}</dt>
                  <dd className="font-medium">{horario.time}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {(instagram || whatsapp) && (
          <div className="fama-card p-6 sm:col-span-2">
            <p className="fama-kicker">Escríbenos</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {instagram && (
                <a href={instagram} target="_blank" rel="noopener noreferrer" className="fama-btn-ghost">
                  Instagram @{FAMA.instagram}
                </a>
              )}
              {whatsapp && (
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="fama-btn-ghost">
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
    </>
  );
}
