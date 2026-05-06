// POST /api/users/lookup-by-email — detect whether an entered invite email belongs to an existing member

import { withApiTraceLite } from "@/lib/trace";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  return withApiTraceLite(req, "/api/users/lookup-by-email", async (req: NextRequest) => {

  try {
    await requireAuth();
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid or empty JSON body" }, { status: 400 });
    }
    const email =
      raw && typeof raw === "object" && "email" in raw && typeof (raw as { email: unknown }).email === "string"
        ? (raw as { email: string }).email
        : "";
    const normalized = email.trim().toLowerCase();

    if (!normalized) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Match login route: case-insensitive (stored casing may differ)
    const user = await prisma.user.findFirst({
      where: { email: { equals: normalized, mode: "insensitive" } },
      select: { id: true, firstName: true, lastName: true, email: true, photoUrl: true },
    });

    return NextResponse.json({ user });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("[lookup-by-email]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  });
}
