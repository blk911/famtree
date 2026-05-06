import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const bodySchema = z.object({
  sessionId: z.string().min(10).max(40),
  visitorToken: z.string().min(8).max(200),
  phone: z.string().max(40).optional(),
  email: z.string().email().optional(),
  igHandle: z.string().max(80).optional(),
  summary: z.string().max(4000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { sessionId, visitorToken, phone, email, igHandle, summary } = parsed.data;

    const session = await prisma.conciergeChatSession.findFirst({
      where: { id: sessionId, visitorToken },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (!phone && !email && !igHandle) {
      return NextResponse.json({ error: "Provide phone, email, or IG handle" }, { status: 400 });
    }

    const recent = await prisma.conciergeChatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "desc" },
      take: 16,
    });
    const transcript = recent
      .reverse()
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n")
      .slice(0, 3500);

    const lead = await prisma.conciergeLeadCapture.create({
      data: {
        sessionId: session.id,
        phone: phone ?? null,
        email: email ?? null,
        igHandle: igHandle ?? null,
        conversationSummary: summary ?? transcript,
        status: "new",
      },
    });

    await prisma.conciergeChatSession.update({
      where: { id: session.id },
      data: {
        funnelStage: "followup",
        status: session.status === "active" ? "active" : session.status,
      },
    });

    return NextResponse.json({ success: true, leadId: lead.id });
  } catch (err) {
    console.error("[concierge/lead]", err);
    return NextResponse.json({ error: "Lead capture failed" }, { status: 500 });
  }
}
