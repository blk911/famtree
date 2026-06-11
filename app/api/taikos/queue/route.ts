import { NextRequest, NextResponse } from "next/server";
import { buildAiosContextPacket } from "@/lib/taikos/context/context-builder";
import { enqueueDraft } from "@/lib/taikos/queue/queue-builder";
import { listQueueItems } from "@/lib/taikos/queue/queue-store";
import { summarizeQueue } from "@/lib/taikos/queue/queue-summary";
import { VMB_TRIAL_COOKIE } from "@/lib/vmb/paths";

export async function GET(req: NextRequest) {
  const trialId = req.cookies.get(VMB_TRIAL_COOKIE)?.value?.trim();
  if (!trialId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  try {
    const items = await listQueueItems(trialId);
    return NextResponse.json({ ok: true, data: summarizeQueue(items) });
  } catch (err) {
    console.error("[taikos:queue:GET]", err);
    return NextResponse.json({ ok: false, error: "Queue read failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const trialId = req.cookies.get(VMB_TRIAL_COOKIE)?.value?.trim();
  if (!trialId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { draftId?: string };
    if (!body.draftId?.trim()) {
      return NextResponse.json({ ok: false, error: "draftId required" }, { status: 400 });
    }

    const ctx = await buildAiosContextPacket({
      trialId,
      pathname: "/vmb/today",
      recordLogin: false,
    });
    if (!ctx) {
      return NextResponse.json({ ok: false, error: "Workspace not found" }, { status: 404 });
    }

    const result = await enqueueDraft(
      trialId,
      ctx.operatorId,
      body.draftId.trim(),
      ctx.goalSummary.goals,
    );
    if ("error" in result) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, data: result });
  } catch (err) {
    console.error("[taikos:queue:POST]", err);
    return NextResponse.json({ ok: false, error: "Queue add failed" }, { status: 500 });
  }
}
