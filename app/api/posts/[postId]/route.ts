// DELETE /api/posts/[postId] — remove post (owner or founder/admin)

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

type RouteCtx = { params: Promise<{ postId: string }> };

export async function DELETE(_req: NextRequest, routeCtx: RouteCtx) {
  try {
    const user = await requireAuth();
    const { postId } = await routeCtx.params;

    if (!postId?.trim()) {
      return NextResponse.json({ error: "postId required" }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where:   { id: postId },
      include: { profile: { select: { userId: true } } },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const isOwner = post.profile.userId === user.id;
    const isAdmin = user.role === "founder" || user.role === "admin";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Not allowed to delete this post" }, { status: 403 });
    }

    await prisma.post.delete({ where: { id: postId } });

    revalidatePath("/dashboard");
    revalidatePath("/family-vault/posts");

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
