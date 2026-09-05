import { FAMA, fullAddress, instagramUrl, whatsappUrl } from "@/lib/fama";
import { FamaLogo } from "@/components/brand/fama-logo";

export function SiteFooter() {
  const direccion = fullAddress();
  const instagram = instagramUrl();
  const whatsapp = whatsappUrl();

  return (
    <footer className="border-t border-white/10 bg-black/30">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-end sm:justify-between sm:px-8">
        <div>
          <FamaLogo size="md" subtitle={FAMA.city} />
          {direccion && <p className="mt-4 text-sm text-white/50">{direccion}</p>}
        </div>

        <div className="flex flex-col gap-3 sm:items-end">
          <div className="flex flex-wrap gap-4 text-sm">
            {instagram && (
              <a href={instagram} target="_blank" rel="noopener noreferrer" className="text-white/60 transition hover:text-white">
                Instagram
              </a>
            )}
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="text-white/60 transition hover:text-white">
                WhatsApp
              </a>
            )}
            <a href="#fechas" className="text-white/60 transition hover:text-white">
              Fechas
            </a>
          </div>
          <p className="text-xs text-white/35">
            © {new Date().getFullYear()} Fama {FAMA.city}. Sin cargos de servicio: el cover llega
            completo a la casa.
          </p>
        </div>
      </div>
    </footer>
  );
}
