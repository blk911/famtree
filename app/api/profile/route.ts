// app/api/profile/route.ts
// GET /api/profile — current user's profile
// PATCH /api/profile — update current user's profile

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getProfilePosts } from "@/lib/posts/queries";
import { PROFILE_PAGE_SELECT, PROFILE_SCALAR_SELECT } from "@/lib/profile/prisma-select";
import { getProfilePhoneSafe } from "@/lib/profile/phone";
import { z } from "zod";

export async function GET() {
  try {
    const user = await requireAuth();

    const [profile, posts, phone] = await Promise.all([
      prisma.profile.findUnique({
        where: { userId: user.id },
        select: PROFILE_PAGE_SELECT,
      }),
      getProfilePosts(user.id),
      getProfilePhoneSafe(user.id),
    ]);

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      profile: {
        ...profile,
        phone: phone ?? "",
        user: {
          ...profile.user,
          selfServiceIdentityChangesRemaining: user.selfServiceIdentityChangesRemaining,
        },
        posts,
      },
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const updateSchema = z.object({
  bio:           z.string().max(500).optional(),
  familyRole:    z.string().optional(),
  location:      z.string().max(120).optional(),
  isPublicInTree: z.boolean().optional(),
  showDob:       z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Please check your profile fields and try again" }, { status: 400 });
    }

    const profileFields = parsed.data;

    const profile = await prisma.profile.update({
      where: { userId: user.id },
      data: profileFields,
      select: PROFILE_SCALAR_SELECT,
    });

    return NextResponse.json({ success: true, profile });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
