// GET — get a single authenticated member's public profile

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getProfilePosts } from "@/lib/posts/queries";

type Context = { params: { userId: string } };

export async function GET(_req: NextRequest, { params }: Context) {
  try {
    await requireAuth();
    const [user, posts] = await Promise.all([
      prisma.user.findUnique({
        where: { id: params.userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          photoUrl: true,
          role: true,
          createdAt: true,
          profile: {
            include: {
              photos: { orderBy: { createdAt: "desc" } },
            },
          },
        },
      }),
      getProfilePosts(params.userId),
    ]);

    if (!user || !user.profile) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({ user: { ...user, profile: { ...user.profile, posts } } });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
