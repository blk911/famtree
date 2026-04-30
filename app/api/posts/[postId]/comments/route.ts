// GET/POST — list and add comments for a post

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

type Context = { params: { postId: string } };

const commentSchema = z.object({
  body: z.string().trim().min(1).max(500),
});

const includeUser = {
  user: {
    select: { id: true, firstName: true, lastName: true, photoUrl: true },
  },
};

export async function GET(_req: NextRequest, { params }: Context) {
  try {
    await requireAuth();
    const comments = await prisma.comment.findMany({
      where: { postId: params.postId },
      orderBy: { createdAt: "asc" },
      take: 10,
      include: includeUser,
    });

    return NextResponse.json({ comments });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Context) {
  try {
    const user = await requireAuth();
    const parsed = commentSchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json({ error: "Comment must be 1-500 characters" }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: { postId: params.postId, userId: user.id, body: parsed.data.body },
      include: includeUser,
    });

    return NextResponse.json({ comment });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
