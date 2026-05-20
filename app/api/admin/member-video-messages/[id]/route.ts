import { withApiTrace } from "@/lib/trace";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

const isAdmin = (role: string) => role === "founder" || role === "admin";

const PatchSchema = z.object({
  isEnabled: z.boolean().optional(),
  title:     z.string().min(1).max(120).optional(),
  caption:   z.string().max(40).optional(),
  videoUrl:  z.string().url().optional().nullable(),
  notes:     z.string().max(2000).optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return withApiTrace(req, "/api/admin/member-video-messages/[id]", async () => {
    try {
      const user = await requireAuth();
      if (!isAdmin(user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const body = await req.json();
      const parsed = PatchSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid body" }, { status: 400 });
      }

      const existing = await prisma.memberVideoMessage.findUnique({
        where: { id: params.id },
      });
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      if (parsed.data.isEnabled === true) {
        await prisma.memberVideoMessage.updateMany({
          where: { slug: existing.slug },
          data: { isEnabled: false },
        });
      }

      const item = await prisma.memberVideoMessage.update({
        where: { id: params.id },
        data: {
          ...(parsed.data.isEnabled !== undefined ? { isEnabled: parsed.data.isEnabled } : {}),
          ...(parsed.data.title !== undefined ? { title: parsed.data.title.trim() } : {}),
          ...(parsed.data.caption !== undefined ? { caption: parsed.data.caption.trim() } : {}),
          ...(parsed.data.videoUrl !== undefined
            ? { videoUrl: parsed.data.videoUrl?.trim() || null }
            : {}),
          ...(parsed.data.notes !== undefined
            ? { notes: parsed.data.notes?.trim() || null }
            : {}),
        },
      });

      return NextResponse.json({ item });
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  });
}
