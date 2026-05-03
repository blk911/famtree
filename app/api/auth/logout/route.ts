// app/api/auth/logout/route.ts

import { withApiTrace } from "@/lib/trace";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  return withApiTrace(req, "/api/auth/logout", async (req: NextRequest) => {

  await clearSessionCookie();
  return NextResponse.json({ success: true });
  });
}
