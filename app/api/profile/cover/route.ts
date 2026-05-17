// app/api/profile/cover/route.ts
// POST — upload cover photo for current user's profile

import { withApiTrace } from "@/lib/trace";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { uploadFile } from "@/lib/storage";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return withApiTrace(req, "/api/profile/cover", async (req: NextRequest) => {

  try {
    const user = await requireAuth();
    const formData = await req.formData();
    const file = formData.get("cover") as File | null;

    if (!file) return NextResponse.json({ error: "No cover photo provided" }, { status: 400 });

    const coverUrl = await uploadFile(file, "cover", randomUUID());

    await prisma.profile.update({
      where: { userId: user.id },
      data: { coverUrl },
      select: { id: true },
    });

    return NextResponse.json({ coverUrl });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    if (typeof err.message === "string" && err.message.startsWith("INVALID_IMAGE:")) {
      return NextResponse.json({ error: err.message.slice("INVALID_IMAGE:".length) }, { status: 400 });
    }
    console.error("[profile/cover]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  });
}
