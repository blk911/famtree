import { NextRequest } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import {
  QUICK_REPLIES_BY_STAGE,
  bumpConfusion,
  isFunnelStage,
  nextFunnelStage,
} from "@/lib/concierge/funnel";
import { buildConciergeSystemPrompt } from "@/lib/concierge/prompts";
import { platformConciergeVoice, resolveVoiceForStudioSlug } from "@/lib/concierge/voice-loader";

const bodySchema = z.object({
  sessionId: z.string().min(10).max(40),
  visitorToken: z.string().min(8).max(200),
  message: z.string().min(1).max(8000),
});

function chunkText(s: string, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size));
  return out.length ? out : [""];
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function demoAssistantReply(mode: string, stage: string, userMessage: string): string {
  const snippet = userMessage.length > 140 ? `${userMessage.slice(0, 140)}…` : userMessage;
  if (mode === "studio_voice") {
    return stage === "pricing"
      ? `Thank you for naming budget honestly — that matters here. Tell me what outcome you're protecting with this spend (energy, mobility, recovery rhythm). I'll mirror language that feels like your studio, not a spreadsheet.`
      : `I'm here — thank you for trusting this page with what's on your mind: "${snippet}". What feeling do you want leaving our care — steadier, bolder, lighter — so I route us without sounding generic?`;
  }
  return `Studios isn't another inbox — it's built so introductions stay human and accountability stays visible. You said: "${snippet}". Want me to explain how invite-aware access keeps both sides dignified?`;
}

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { sessionId, visitorToken, message } = parsed.data;
  const trimmed = message.trim();

  const session = await prisma.conciergeChatSession.findFirst({
    where: { id: sessionId, visitorToken },
  });

  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  await prisma.conciergeChatMessage.create({
    data: {
      sessionId: session.id,
      role: "user",
      content: trimmed,
    },
  });

  const voice =
    session.mode === "studio_voice" && session.contextKey !== "platform"
      ? await resolveVoiceForStudioSlug(session.contextKey)
      : platformConciergeVoice();

  if (session.takeoverUserId) {
    const hold =
      session.mode === "studio_voice"
        ? `${voice.studioDisplayName ?? "This studio"}'s owner is with you live — I'll stay quiet while they reply.`
        : `A human from our side has joined this thread — I'll step back while they respond.`;

    await prisma.conciergeChatMessage.create({
      data: { sessionId: session.id, role: "assistant", content: hold },
    });

    const enc = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(enc.encode(`${JSON.stringify({ type: "token", v: hold })}\n`));
        controller.enqueue(
          enc.encode(
            `${JSON.stringify({
              type: "meta",
              stage: session.funnelStage,
              quickReplies: [],
              takeoverHold: true,
            })}\n`,
          ),
        );
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  const confusion = bumpConfusion(trimmed, session.confusionSignals);
  await prisma.conciergeChatSession.update({
    where: { id: session.id },
    data: { confusionSignals: confusion },
  });

  const memory = await prisma.conciergeClientMemory.findUnique({
    where: {
      visitorToken_contextKey: {
        visitorToken,
        contextKey: session.contextKey,
      },
    },
  });

  let system = buildConciergeSystemPrompt({
    mode: session.mode === "studio_voice" ? "studio_voice" : "concierge",
    voice,
    funnelStage: session.funnelStage,
    memorySnippet: memory?.notes ?? null,
  });

  if (session.funnelStage === "escalation" || confusion >= 1) {
    system += `\n\nCREATOR_BUSY_ESCALATION_HINT:\nIf appropriate this turn, weave this human exit gracefully (paraphrase ok):\n"${voice.escalationPhrase}"`;
  }

  const prior = await prisma.conciergeChatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "asc" },
    take: 48,
  });

  const chatTurns = prior
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const openaiMessages = [
    { role: "system" as const, content: system },
    ...chatTurns.map((m) => ({ role: m.role, content: m.content })),
  ];

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const push = (obj: unknown) => controller.enqueue(enc.encode(`${JSON.stringify(obj)}\n`));

      let assistantFull = "";

      try {
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
          assistantFull = demoAssistantReply(session.mode, session.funnelStage, trimmed);
          for (const chunk of chunkText(assistantFull, 16)) {
            push({ type: "token", v: chunk });
            await delay(22);
          }
        } else {
          const openai = new OpenAI({ apiKey });
          const model = process.env.OPENAI_CONCIERGE_MODEL ?? "gpt-4o-mini";
          const resp = await openai.chat.completions.create({
            model,
            messages: openaiMessages,
            stream: true,
            temperature: 0.72,
            max_tokens: 680,
          });

          for await (const part of resp) {
            const t = part.choices[0]?.delta?.content ?? "";
            if (t) {
              assistantFull += t;
              push({ type: "token", v: t });
            }
          }
        }

        assistantFull = assistantFull.trim();
        if (!assistantFull) {
          assistantFull =
            "I'm here — give me one more beat on what you're navigating and I'll stay right with you.";
        }

        await prisma.conciergeChatMessage.create({
          data: {
            sessionId: session.id,
            role: "assistant",
            content: assistantFull,
            metadata: {},
          },
        });

        const stageBefore = isFunnelStage(session.funnelStage) ? session.funnelStage : "greeting";
        const nextStage = nextFunnelStage(stageBefore, trimmed, confusion);

        await prisma.conciergeChatSession.update({
          where: { id: session.id },
          data: {
            funnelStage: nextStage,
            confusionSignals: confusion,
            summaryLine: assistantFull.slice(0, 320),
            updatedAt: new Date(),
          },
        });

        const qr = QUICK_REPLIES_BY_STAGE[nextStage] ?? QUICK_REPLIES_BY_STAGE.followup;

        push({
          type: "meta",
          stage: nextStage,
          quickReplies: qr,
          demoMode: !process.env.OPENAI_API_KEY,
        });

        controller.close();
      } catch (err) {
        console.error("[concierge/chat]", err);
        push({ type: "error", message: "Concierge stream failed — try again shortly." });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
