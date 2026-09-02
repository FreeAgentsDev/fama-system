import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, isValidAdminToken } from "@/lib/admin-session";

const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/api/admin/login", "/api/admin/logout"]);

/**
 * Protege /admin/* (páginas) y /api/admin/* (proxy hacia Iraca). Sin esto, cualquiera que
 * conozca la URL del server de Iraca podría llamar los endpoints de admin directo — por eso
 * las páginas de admin NO hablan con Iraca desde el navegador, siempre pasan por /api/admin/*.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ADMIN_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (await isValidAdminToken(token)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
