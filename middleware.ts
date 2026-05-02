// middleware.ts
// Protects /dashboard, /profile, /invite, /tree, /settings
// Redirects unauthenticated requests to /login

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-in-production"
);

// /invite/[token] is the public challenge page — only the bare /invite sending
// page needs auth. We protect /invite exactly, not as a prefix.
const PROTECTED = ["/dashboard", "/profile", "/tree", "/settings"];
const AUTH_ROUTES = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /invite (send page) is protected; /invite/[token] (challenge page) is public
  const isProtected =
    PROTECTED.some((p) => pathname.startsWith(p)) ||
    pathname === "/invite";
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p));

  const token = request.cookies.get("AMIHUMAN.NET_session")?.value;

  let isAuthenticated = false;
  if (token) {
    try {
      await jwtVerify(token, SECRET);
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  // Redirect unauthenticated users away from protected routes
  if (isProtected && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect authenticated users away from login/register.
  // Exception: /register with an invite token must always be reachable so that
  // an invited user can create their own account even if another session exists
  // in this browser (e.g. the person who sent the invite is still logged in).
  const isRegisterWithInvite =
    pathname === "/register" && request.nextUrl.searchParams.has("token");

  if (isAuthRoute && isAuthenticated && !isRegisterWithInvite) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|uploads|favicon.ico).*)",
  ],
};
