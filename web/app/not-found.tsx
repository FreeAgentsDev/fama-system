import { FamaLogo } from "@/components/brand/fama-logo";

export default function NotFound() {
  return (
    <div className="fama-atmosphere flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <FamaLogo href="/" size="lg" />
      <h1 className="mt-8 text-2xl font-semibold">No encontramos esa página</h1>
      <p className="mt-2 max-w-sm text-sm text-white/55">El enlace puede estar vencido o el evento ya no está publicado.</p>
    </div>
  );
}
