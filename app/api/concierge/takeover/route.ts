import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const bodySchema = z.object({
  sessionId: z.string().min(10).max(40),
  enable: z.boolean(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { sessionId, enable } = parsed.data;

    const session = await prisma.conciergeChatSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const studio = await prisma.studio.findFirst({
      where: { slug: session.contextKey, ownerId: user.id },
    });
    if (!studio) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.conciergeChatSession.update({
      where: { id: sessionId },
      data: { takeoverUserId: enable ? user.id : null },
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("[concierge/takeover]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
