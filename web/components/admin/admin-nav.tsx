"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/admin/eventos", label: "Eventos" },
  { href: "/admin/sala", label: "Sala" },
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
    <nav className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950 px-4 py-3 sm:px-6">
      <div className="flex items-center gap-1">
        <span className="mr-4 font-bold text-white">Fama · Admin</span>
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded px-3 py-1.5 text-sm ${
              pathname.startsWith(link.href)
                ? "bg-amber-400 font-semibold text-black"
                : "text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="text-sm text-neutral-400 hover:text-white"
      >
        Salir
      </button>
    </nav>
  );
}
