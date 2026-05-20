import { withApiTrace } from "@/lib/trace";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

const BodySchema = z.object({
  messageId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  return withApiTrace(req, "/api/dashboard/member-video/complete", async () => {
    try {
      const user = await requireAuth();
      if (user.role === "founder" || user.role === "admin") {
        return NextResponse.json({ ok: true });
      }

      const body = await req.json();
      const parsed = BodySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "messageId required" }, { status: 400 });
      }

      const message = await prisma.memberVideoMessage.findFirst({
        where: { id: parsed.data.messageId, isEnabled: true },
      });
      if (!message) {
        return NextResponse.json({ error: "Message not active" }, { status: 404 });
      }

      await prisma.memberVideoCompletion.upsert({
        where: {
          userId_messageId: { userId: user.id, messageId: message.id },
        },
        create: { userId: user.id, messageId: message.id },
        update: { completedAt: new Date() },
      });

      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  });
}
