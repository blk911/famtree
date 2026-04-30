// GET/POST — read or toggle the current user's like on a post

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

type Context = { params: { postId: string } };

export async function GET(_req: NextRequest, { params }: Context) {
  try {
    const user = await requireAuth();
    const [like, count] = await Promise.all([
      prisma.like.findUnique({ where: { postId_userId: { postId: params.postId, userId: user.id } } }),
      prisma.like.count({ where: { postId: params.postId } }),
    ]);

    return NextResponse.json({ liked: !!like, count });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(_req: NextRequest, { params }: Context) {
  try {
    const user = await requireAuth();
    const existing = await prisma.like.findUnique({
      where: { postId_userId: { postId: params.postId, userId: user.id } },
    });

    const liked = !existing;
    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
    } else {
      await prisma.like.create({ data: { postId: params.postId, userId: user.id } });
    }

    const count = await prisma.like.count({ where: { postId: params.postId } });
    return NextResponse.json({ liked, count });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
