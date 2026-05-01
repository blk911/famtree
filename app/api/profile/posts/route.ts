// app/api/profile/posts/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";
import { uploadFile, validateImage } from "@/lib/storage";

const createPostSchema = z.object({
  body: z.string().min(1).max(2000),
  title: z.string().max(100).optional(),
  imageUrl: z.string().optional(),
  visibleTo: z.array(z.string()).optional(),
});

async function savePostImage(file: File): Promise<string> {
  const err = validateImage(file);
  if (err) throw new Error("INVALID_IMAGE");
  return uploadFile(file, "post", randomUUID());
}

const postInclude = {
  profile: {
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, photoUrl: true },
      },
    },
  },
};

// POST — create a timeline post
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const contentType = req.headers.get("content-type") ?? "";
    let parsed: ReturnType<typeof createPostSchema.safeParse>;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const body = formData.get("body");
      const title = formData.get("title");
      const image = formData.get("image") as File | null;
      const imageUrlRaw = formData.get("imageUrl");
      const visibleToRaw = formData.get("visibleTo");
      let imageUrl: string | undefined;
      let visibleTo: string[] | undefined;

      if (image && image.size > 0) {
        imageUrl = await savePostImage(image);
      } else if (typeof imageUrlRaw === "string" && imageUrlRaw.trim()) {
        imageUrl = imageUrlRaw.trim();
      }
      if (typeof visibleToRaw === "string") {
        try { visibleTo = JSON.parse(visibleToRaw); } catch { /* ignore */ }
      }

      parsed = createPostSchema.safeParse({
        body: typeof body === "string" ? body : "",
        title: typeof title === "string" && title.trim() ? title.trim() : undefined,
        imageUrl,
        visibleTo,
      });
    } else {
      const body = await req.json();
      parsed = createPostSchema.safeParse(body);
    }

    if (!parsed.success) {
      return NextResponse.json({ error: "Post must include text between 1 and 2000 characters" }, { status: 400 });
    }

    const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const post = await (prisma.post.create as any)({
      data: {
        profileId: profile.id,
        title: parsed.data.title || null,
        body: parsed.data.body,
        imageUrl: parsed.data.imageUrl || null,
      },
      include: postInclude,
    });

    const visibleTo = parsed.data.visibleTo;
    if (visibleTo && visibleTo.length > 0) {
      await (prisma as any).postVisibility.createMany({
        data: visibleTo.map((userId: string) => ({ postId: post.id, userId })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({
      success: true,
      post: { ...post, _count: { likes: 0, comments: 0 }, visibleTo: visibleTo ?? [] },
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (err.message === "INVALID_IMAGE") {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }
    if (err.message === "IMAGE_TOO_LARGE") {
      return NextResponse.json({ error: "Image must be under 5 MB" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/profile/posts?postId=xxx
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json({ error: "postId required" }, { status: 400 });
    }

    const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
    const post = await prisma.post.findUnique({ where: { id: postId } });

    if (!post || post.profileId !== profile?.id) {
      return NextResponse.json({ error: "Not found or not yours" }, { status: 404 });
    }

    await prisma.post.delete({ where: { id: postId } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
