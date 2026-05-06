import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { inferStudiosConciergeContext } from "@/lib/concierge/route-context";
import { platformConciergeVoice, resolveVoiceForStudioSlug } from "@/lib/concierge/voice-loader";

const bodySchema = z.object({
  pathname: z.string(),
  visitorToken: z.string().min(8).max(200),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const { pathname, visitorToken } = parsed.data;
    const ctx = inferStudiosConciergeContext(pathname);

    const openingVoice =
      ctx.mode === "studio_voice" && ctx.studioSlug
        ? await resolveVoiceForStudioSlug(ctx.studioSlug)
        : platformConciergeVoice();

    let session = await prisma.conciergeChatSession.findUnique({
      where: {
        visitorToken_contextKey: {
          visitorToken,
          contextKey: ctx.contextKey,
        },
      },
    });

    if (!session) {
      session = await prisma.conciergeChatSession.create({
        data: {
          visitorToken,
          contextKey: ctx.contextKey,
          mode: ctx.mode,
          funnelStage: "greeting",
        },
      });

      await prisma.conciergeChatMessage.create({
        data: {
          sessionId: session.id,
          role: "assistant",
          content: openingVoice.greetingStyle,
          metadata: { kind: "opening_greeting" },
        },
      });
    } else {
      const msgCount = await prisma.conciergeChatMessage.count({
        where: { sessionId: session.id },
      });
      if (msgCount === 0) {
        await prisma.conciergeChatMessage.create({
          data: {
            sessionId: session.id,
            role: "assistant",
            content: openingVoice.greetingStyle,
            metadata: { kind: "opening_greeting" },
          },
        });
      }
    }

    const messages = await prisma.conciergeChatMessage.findMany({
      where: { sessionId: session!.id },
      orderBy: { createdAt: "asc" },
      take: 80,
      select: { id: true, role: true, content: true, createdAt: true },
    });

    const fresh = await prisma.conciergeChatSession.findUniqueOrThrow({
      where: { id: session!.id },
    });

    return Response.json({
      sessionId: fresh.id,
      mode: ctx.mode,
      studioSlug: ctx.studioSlug,
      contextKey: ctx.contextKey,
      funnelStage: fresh.funnelStage,
      messages,
    });
  } catch (err) {
    console.error("[concierge/session]", err);
    return Response.json({ error: "Session bootstrap failed" }, { status: 500 });
  }
}
