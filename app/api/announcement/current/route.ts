// app/api/announcement/current/route.ts
import { withApiTrace } from "@/lib/trace";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  return withApiTrace(req, "/api/announcement/current", async (req: NextRequest) => {

  try {
    const user = await requireAuth();

    const announcement = await (prisma as any).siteAnnouncement.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (!announcement) return NextResponse.json({ announcement: null });

    const viewRecord = await (prisma as any).announcementView.findUnique({
      where: { userId_announcementId: { userId: user.id, announcementId: announcement.id } },
    });

    return NextResponse.json({
      announcement,
      viewCount: viewRecord?.viewCount ?? 0,
      dismissedAt: viewRecord?.dismissedAt ?? null,
    });
  } catch {
    return NextResponse.json({ announcement: null });
  }
  });
}
