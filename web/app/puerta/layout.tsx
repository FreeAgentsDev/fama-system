import type { Metadata, Viewport } from "next";

// Next.js solo soporta un manifest global (app/manifest.ts en la raíz), no manifests anidados
// por ruta — por eso el de /puerta vive como archivo estático en `public/` y se referencia
// aquí con `metadata.manifest`, que sí es específico de este layout/ruta.
export const metadata: Metadata = {
  title: "Fama — Puerta",
  description: "Scanner de boletas para la puerta de Fama MZL",
  manifest: "/manifest-puerta.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Puerta",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function PuertaLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-black text-white">{children}</div>;
}
