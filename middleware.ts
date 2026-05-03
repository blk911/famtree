// middleware.ts
// Protects /dashboard, /profile, /invite, /tree, /settings
// Redirects unauthenticated requests to /login

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getJwtSecretKey } from "@/lib/auth/jwt-secret";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session-cookie";

// /invite/[token] is the public challenge page — only the bare /invite sending
// page needs auth. We protect /invite exactly, not as a prefix.
const PROTECTED = ["/dashboard", "/profile", "/tree", "/settings"];
const AUTH_ROUTES = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;

    if (pathname.startsWith("/api") || pathname === "/openapi.yaml") {
      const incoming = request.headers.get("x-request-id");
      const id = incoming && incoming.length > 0 ? incoming : crypto.randomUUID();
      const headers = new Headers(request.headers);
      headers.set("x-request-id", id);
      return NextResponse.next({ request: { headers } });
    }

    const isProtected =
      PROTECTED.some((p) => pathname.startsWith(p)) ||
      pathname === "/invite";
    const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p));

    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    let isAuthenticated = false;
    if (token) {
      try {
        await jwtVerify(token, getJwtSecretKey());
        isAuthenticated = true;
      } catch {
        isAuthenticated = false;
      }
    }

    if (isProtected && !isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const isRegisterWithInvite =
      pathname === "/register" && request.nextUrl.searchParams.has("token");

    if (isAuthRoute && isAuthenticated && !isRegisterWithInvite) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  } catch (err) {
    console.error("[middleware]", err);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|uploads|favicon.ico).*)",
  ],
};
