// PATCH — current user’s mute/hide preference for another member on their tree

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const bodySchema = z.object({
  targetId: z.string().uuid(),
  muted: z.boolean().optional(),
  hidden: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const viewer = await requireAuth();
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { targetId, muted, hidden } = parsed.data;

    if (targetId === viewer.id) {
      return NextResponse.json({ error: "Cannot change preferences for yourself" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (muted === undefined && hidden === undefined) {
      return NextResponse.json({ error: "No changes" }, { status: 400 });
    }

    const data: { muted?: boolean; hidden?: boolean } = {};
    if (muted !== undefined) data.muted = muted;
    if (hidden !== undefined) data.hidden = hidden;

    const row = await prisma.treeViewPreference.upsert({
      where: {
        viewerId_targetId: { viewerId: viewer.id, targetId },
      },
      create: {
        viewerId: viewer.id,
        targetId,
        muted: muted ?? false,
        hidden: hidden ?? false,
      },
      update: data,
    });

    return NextResponse.json({
      preference: { targetId: row.targetId, muted: row.muted, hidden: row.hidden },
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("[tree/view-preference]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
