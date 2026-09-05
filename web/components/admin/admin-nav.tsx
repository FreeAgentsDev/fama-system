"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FamaLogo } from "@/components/brand/fama-logo";

const LINKS = [
  { href: "/admin/eventos", label: "Eventos" },
  { href: "/admin/salas", label: "Salas" },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <nav className="sticky top-0 z-20 border-b border-white/10 bg-[#07070b]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <FamaLogo href="/admin/eventos" size="sm" subtitle="Admin" />
          <div className="flex gap-1">
            {LINKS.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-4 py-1.5 text-sm transition ${
                    active
                      ? "bg-[#e8b84a] font-semibold text-[#1a1306]"
                      : "text-white/65 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
        <button type="button" onClick={handleLogout} className="text-sm text-white/45 hover:text-white">
          Salir
        </button>
      </div>
    </nav>
  );
}
