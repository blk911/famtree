// Clears session cookie when the browser still has a JWT but the app treats the user as logged out
// (revoked session row, suspended account, etc.). Must run in a Route Handler — not in RSC render.

import { withApiTrace } from "@/lib/trace";
import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
  return withApiTrace(req, "/api/auth/clear-stale-session", async (req: NextRequest) => {

  await clearSessionCookie();
  return NextResponse.redirect(new URL("/login", req.url));
  });
}
