// GET — get a single authenticated member's public profile

import { withApiTrace } from "@/lib/trace";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { PROFILE_SCALAR_SELECT } from "@/lib/profile/prisma-select";
import { getProfilePosts } from "@/lib/posts/queries";

type Context = { params: { userId: string } };

export async function GET(_req: NextRequest, routeCtx: Context) {
  return withApiTrace(_req, "/api/members/[userId]", async (_req: NextRequest, routeCtx) => {
const { params } = routeCtx;

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
            select: {
              ...PROFILE_SCALAR_SELECT,
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
  }, routeCtx);
}
