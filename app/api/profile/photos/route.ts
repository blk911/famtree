// app/api/profile/photos/route.ts
// POST — upload a photo to the current user's gallery
// DELETE — remove a gallery photo

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { uploadFile, deleteFile, validateImage } from "@/lib/storage";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const user    = await requireAuth();
    const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const formData = await req.formData();
    const file     = formData.get("photo") as File | null;
    const caption  = formData.get("caption");

    if (!file) return NextResponse.json({ error: "No photo provided" }, { status: 400 });

    const err = validateImage(file);
    if (err)  return NextResponse.json({ error: err }, { status: 400 });

    const url = await uploadFile(file, "gallery", randomUUID());

    const photo = await prisma.photo.create({
      data: {
        profileId: profile.id,
        url,
        caption: typeof caption === "string" && caption.trim() ? caption.trim() : null,
      },
    });

    return NextResponse.json({ photo });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    console.error("[profile/photos POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user    = await requireAuth();
    const photoId = new URL(req.url).searchParams.get("photoId");
    if (!photoId) return NextResponse.json({ error: "photoId required" }, { status: 400 });

    const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
    const photo   = await prisma.photo.findUnique({ where: { id: photoId } });

    if (!profile || !photo || photo.profileId !== profile.id)
      return NextResponse.json({ error: "Not found or not yours" }, { status: 404 });

    await deleteFile(photo.url);
    await prisma.photo.delete({ where: { id: photoId } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
