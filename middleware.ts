// middleware.ts
// Protects /dashboard, /profile, /invite, /tree, /settings
// Redirects unauthenticated requests to /login

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-in-production"
);

const PROTECTED = ["/dashboard", "/profile", "/invite", "/tree", "/settings"];
const AUTH_ROUTES = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p));

  const token = request.cookies.get("famtree_session")?.value;

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

  // Redirect authenticated users away from login/register
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|uploads|favicon.ico).*)",
  ],
};
