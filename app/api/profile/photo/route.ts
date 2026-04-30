// app/api/profile/photo/route.ts
// POST — upload profile photo (multipart/form-data)

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { uploadFile, validateImage } from "@/lib/storage";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();

    const formData = await req.formData();
    const file = formData.get("photo") as File | null;

    if (!file) return NextResponse.json({ error: "No photo provided" }, { status: 400 });

    const err = validateImage(file);
    if (err)  return NextResponse.json({ error: err }, { status: 400 });

    const photoUrl = await uploadFile(file, "profile", uuidv4());

    await prisma.user.update({ where: { id: user.id }, data: { photoUrl } });

    return NextResponse.json({ success: true, photoUrl });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    console.error("[photo/upload]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
