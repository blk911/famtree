// POST — upload and save cover photo for current user's profile

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
    const formData = await req.formData();
    const file = formData.get("cover") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No cover photo provided" }, { status: 400 });
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

    const coverUrl = `/uploads/${filename}`;
    await prisma.profile.update({
      where: { userId: user.id },
      data: { coverUrl },
    });

    return NextResponse.json({ coverUrl });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("[profile/cover]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
