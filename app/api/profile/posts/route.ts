// app/api/profile/posts/route.ts

import { withApiTrace } from "@/lib/trace";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { PROFILE_FEED_SELECT } from "@/lib/profile/prisma-select";
import { z } from "zod";
import { randomUUID } from "crypto";
import { uploadFile } from "@/lib/storage";
import { MAX_IMAGE_UPLOAD_BYTES, MAX_VIDEO_UPLOAD_BYTES } from "@/lib/media/upload-limits";
import type { DashboardPostScope } from "@prisma/client";
import { userMayPostWithScope } from "@/lib/posts/post-scope-access";

const scopeEnum = z.enum(["FAMILY", "BUSINESS", "CLUB", "CHURCH", "PRIVATE"]);

const createPostSchema = z.object({
  body: z.string().min(1).max(2000),
  title: z.string().max(100).optional(),
  imageUrl: z.string().optional(),
  visibleTo: z.array(z.string()).optional(),
  scope: scopeEnum.optional(),
  spaceId: z.string().uuid().nullable().optional(),
});

const postInclude = {
  profile: {
    select: PROFILE_FEED_SELECT,
  },
  visibility: { select: { userId: true } as const },
  _count: { select: { likes: true, comments: true } },
} as const;

async function loadCreatedPost(postId: string) {
  return prisma.post.findUniqueOrThrow({
    where: { id: postId },
    include: postInclude,
  });
}

// POST — create a timeline post
export async function POST(req: NextRequest) {
  return withApiTrace(req, "/api/profile/posts", async (req: NextRequest) => {
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
        const scopeRaw = formData.get("scope");
        const spaceIdRaw = formData.get("spaceId");
        let imageUrl: string | undefined;
        let visibleTo: string[] | undefined;

        if (image && image.size > 0) {
          imageUrl = await uploadFile(image, "post", randomUUID());
        } else if (typeof imageUrlRaw === "string" && imageUrlRaw.trim()) {
          imageUrl = imageUrlRaw.trim();
        }
        if (typeof visibleToRaw === "string") {
          try {
            visibleTo = JSON.parse(visibleToRaw);
          } catch {
            /* ignore */
          }
        }

        const scopeParsed =
          typeof scopeRaw === "string" && scopeRaw.trim()
            ? scopeEnum.safeParse(scopeRaw.trim())
            : { success: true as const, data: undefined };
        if (!scopeParsed.success) {
          return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
        }

        let spaceId: string | null | undefined;
        if (typeof spaceIdRaw === "string" && spaceIdRaw.trim()) {
          spaceId = spaceIdRaw.trim();
        } else if (spaceIdRaw === "" || spaceIdRaw === null) {
          spaceId = null;
        }

        parsed = createPostSchema.safeParse({
          body: typeof body === "string" ? body : "",
          title: typeof title === "string" && title.trim() ? title.trim() : undefined,
          imageUrl,
          visibleTo,
          scope: scopeParsed.data,
          spaceId,
        });
      } else {
        const body = await req.json();
        parsed = createPostSchema.safeParse(body);
      }

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Post must include text between 1 and 2000 characters" },
          { status: 400 },
        );
      }

      let scope = (parsed.data.scope ?? "FAMILY") as DashboardPostScope;
      let spaceId: string | null = parsed.data.spaceId ?? null;
      const visibleTo = parsed.data.visibleTo?.filter(Boolean) ?? [];

      if (visibleTo.length > 0 && scope === "FAMILY") {
        return NextResponse.json(
          { error: "Recipients require PRIVATE scope", code: "BAD_SCOPE_FOR_RECIPIENTS" },
          { status: 400 },
        );
      }

      if ((scope === "BUSINESS" || scope === "CLUB" || scope === "CHURCH") && !spaceId) {
        return NextResponse.json(
          { error: "Space required for this scope", code: "NOT_ALLOWED_FOR_SCOPE" },
          { status: 403 },
        );
      }

      if ((scope === "FAMILY" || scope === "PRIVATE") && spaceId) {
        return NextResponse.json({ error: "This scope does not use a space" }, { status: 400 });
      }

      const allowed = await userMayPostWithScope({ userId: user.id, scope, spaceId });
      if (!allowed) {
        return NextResponse.json(
          {
            error: "You don't have access to post in that space.",
            code: "NOT_ALLOWED_FOR_SCOPE",
          },
          { status: 403 },
        );
      }

      const profile = await prisma.profile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (!profile) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }

      const post = await prisma.post.create({
        data: {
          profileId: profile.id,
          title: parsed.data.title || null,
          body: parsed.data.body,
          imageUrl: parsed.data.imageUrl || null,
          scope,
          spaceId: scope === "FAMILY" || scope === "PRIVATE" ? null : spaceId,
        },
      });

      if (visibleTo.length > 0) {
        await prisma.postVisibility.createMany({
          data: visibleTo.map((userId: string) => ({ postId: post.id, userId })),
          skipDuplicates: true,
        });
      }

      const full = await loadCreatedPost(post.id);

      return NextResponse.json({
        success: true,
        post: full,
      });
    } catch (err: any) {
      if (err.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }
      if (typeof err.message === "string" && err.message.startsWith("INVALID_IMAGE:")) {
        return NextResponse.json(
          { error: err.message.slice("INVALID_IMAGE:".length) },
          { status: 400 },
        );
      }
      if (err.message === "IMAGE_TOO_LARGE") {
        return NextResponse.json(
          {
            error: `Attachments: images max ${MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024)} MB, videos max ${MAX_VIDEO_UPLOAD_BYTES / (1024 * 1024)} MB.`,
          },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
}

// DELETE /api/profile/posts?postId=xxx
export async function DELETE(req: NextRequest) {
  return withApiTrace(req, "/api/profile/posts", async (req: NextRequest) => {
    try {
      const user = await requireAuth();
      const { searchParams } = new URL(req.url);
      const postId = searchParams.get("postId");

      if (!postId) {
        return NextResponse.json({ error: "postId required" }, { status: 400 });
      }

      const profile = await prisma.profile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
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
  });
}
