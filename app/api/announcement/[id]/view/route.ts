// app/api/announcement/[id]/view/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

// POST — log a view or dismiss permanently
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const { dismiss } = await req.json().catch(() => ({}));
    const announcementId = params.id;

    const existing = await (prisma as any).announcementView.findUnique({
      where: { userId_announcementId: { userId: user.id, announcementId } },
    });

    if (existing) {
      await (prisma as any).announcementView.update({
        where: { userId_announcementId: { userId: user.id, announcementId } },
        data: {
          viewCount: { increment: 1 },
          ...(dismiss ? { dismissedAt: new Date() } : {}),
        },
      });
    } else {
      await (prisma as any).announcementView.create({
        data: {
          userId: user.id,
          announcementId,
          viewCount: 1,
          ...(dismiss ? { dismissedAt: new Date() } : {}),
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
