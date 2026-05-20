import { withApiTrace } from "@/lib/trace";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { DEFAULT_MEMBER_VIDEO_SLUG } from "@/lib/admin/memberVideoMessages";

const isAdmin = (role: string) => role === "founder" || role === "admin";

const CreateSchema = z.object({
  slug:     z.literal("dashboard-intro").optional(),
  title:    z.string().min(1).max(120),
  caption:  z.string().max(40).optional(),
  videoUrl: z.string().max(2000).optional(),
  notes:    z.string().max(2000).optional(),
});

export async function GET(req: NextRequest) {
  return withApiTrace(req, "/api/admin/member-video-messages", async () => {
    try {
      const user = await requireAuth();
      if (!isAdmin(user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const items = await prisma.memberVideoMessage.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      return NextResponse.json({ items });
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  });
}

export async function POST(req: NextRequest) {
  return withApiTrace(req, "/api/admin/member-video-messages", async () => {
    try {
      const user = await requireAuth();
      if (!isAdmin(user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const body = await req.json();
      const parsed = CreateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid body" }, { status: 400 });
      }

      const { title, caption, videoUrl, notes } = parsed.data;
      const slug = parsed.data.slug ?? DEFAULT_MEMBER_VIDEO_SLUG;

      const item = await prisma.memberVideoMessage.create({
        data: {
          slug,
          title: title.trim(),
          caption: (caption ?? "Watch Once").trim(),
          videoUrl: videoUrl?.trim() || null,
          notes: notes?.trim() || null,
          isEnabled: false,
          createdById: user.id,
        },
      });

      return NextResponse.json({ item });
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  });
}
