"use client";

import { useEffect, useState } from "react";
import { FamaLogo } from "@/components/brand/fama-logo";
import { FAMA, GALERIA, fullAddress, instagramUrl, whatsappUrl } from "@/lib/fama";

/**
 * Los enlaces se calculan de los datos, no se escriben a mano: "Galería" y "Visítanos" sólo
 * se renderizan si esas secciones existen. Un ancla que no lleva a ninguna parte es peor que
 * no tener el enlace.
 */
const LINKS = [
  { href: "#fechas", label: "Fechas", visible: true },
  { href: "#la-casa", label: "La casa", visible: true },
  { href: "#galeria", label: "Galería", visible: GALERIA.length > 0 },
  {
    href: "#visitanos",
    label: "Visítanos",
    visible: Boolean(fullAddress() || FAMA.hours.length || instagramUrl() || whatsappUrl()),
  },
].filter((link) => link.visible);

/**
 * Barra fija del portal. Arranca transparente sobre el hero y se opaca al bajar, para que
 * el fondo del lounge se vea limpio al abrir y los enlaces sigan legibles sobre la cartelera.
 */
export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // `passive` porque esto sólo lee scrollY: sin esto el navegador no puede adelantar el scroll.
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled ? "border-b border-white/10 bg-[#07070b]/85 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <FamaLogo href="/" size="sm" />
        <ul className="hidden items-center gap-1 sm:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="rounded-full px-3 py-2 text-sm text-white/65 transition hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <a href="#fechas" className="fama-btn px-4 py-2 text-sm">
          Aparta tu noche
        </a>
      </nav>
    </header>
  );
}
