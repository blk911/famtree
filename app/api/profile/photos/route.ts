// POST — upload a photo to the current user's gallery; DELETE — remove a gallery photo

import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

function extensionFor(file: File) {
  return file.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("photo") as File | null;
    const caption = formData.get("caption");

    if (!file) {
      return NextResponse.json({ error: "No photo provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "Image must be under 5 MB" }, { status: 400 });
    }

    const filename = `${randomUUID()}.${extensionFor(file)}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));

    const photo = await prisma.photo.create({
      data: {
        profileId: profile.id,
        url: `/uploads/${filename}`,
        caption: typeof caption === "string" && caption.trim() ? caption.trim() : null,
      },
    });

    return NextResponse.json({ photo });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("[profile/photos]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const photoId = searchParams.get("photoId");

    if (!photoId) {
      return NextResponse.json({ error: "photoId required" }, { status: 400 });
    }

    const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
    const photo = await prisma.photo.findUnique({ where: { id: photoId } });

    if (!profile || !photo || photo.profileId !== profile.id) {
      return NextResponse.json({ error: "Not found or not yours" }, { status: 404 });
    }

    await prisma.photo.delete({ where: { id: photoId } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
