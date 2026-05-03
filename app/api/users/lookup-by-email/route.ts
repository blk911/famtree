// POST /api/users/lookup-by-email — detect whether an entered invite email belongs to an existing member

import { withApiTrace } from "@/lib/trace";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  return withApiTrace(req, "/api/users/lookup-by-email", async (req: NextRequest) => {

  try {
    await requireAuth();
    const { email } = await req.json();
    const normalized = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalized) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true, firstName: true, lastName: true, email: true, photoUrl: true },
    });

    return NextResponse.json({ user });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  });
}
