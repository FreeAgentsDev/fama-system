import type { Metadata, Viewport } from "next";
import { Great_Vibes, Outfit } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const greatVibes = Great_Vibes({
  variable: "--font-great-vibes",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Fama MZL — Lounge en Manizales",
    template: "%s — Fama MZL",
  },
  description:
    "Tragos con alma, noches con historia. Cartelera, boletas con QR y la casa de Fama en Manizales.",
};

export const viewport: Viewport = {
  themeColor: "#07070b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${outfit.variable} ${greatVibes.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Script src="https://checkout.wompi.co/widget.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
