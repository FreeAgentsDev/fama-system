import { FamaLogo } from "@/components/brand/fama-logo";

export function PublicHeader() {
  return (
    <header className="flex items-center justify-between px-1 py-5">
      <FamaLogo href="/" size="sm" subtitle="Manizales" />
      <p className="hidden text-xs uppercase tracking-[0.22em] text-white/45 sm:block">
        Boletería virtual
      </p>
    </header>
  );
}
