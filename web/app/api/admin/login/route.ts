import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, adminSessionToken, isValidAdminPin } from "@/lib/admin-session";

export async function POST(request: Request): Promise<Response> {
  if (!process.env.FAMA_ADMIN_PIN || !process.env.ADMIN_SESSION_SECRET) {
    console.error("Falta FAMA_ADMIN_PIN o ADMIN_SESSION_SECRET en web/.env.");
    return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  }

  let body: { pin?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const pin = String(body?.pin ?? "");
  if (!pin || !isValidAdminPin(pin)) {
    return NextResponse.json({ error: "invalid pin" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, await adminSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
