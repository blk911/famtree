// app/api/auth/me/route.ts

import { withApiTrace } from "@/lib/trace";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  return withApiTrace(req, "/api/auth/me", async (req: NextRequest) => {

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    photoUrl: user.photoUrl,
    role: user.role,
    emailVerified: user.emailVerified,
  });
  });
}
