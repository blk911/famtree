import { NextRequest, NextResponse } from "next/server";
import { buildAiosContextPacket } from "@/lib/taikos/context/context-builder";
import { executeQueueItem } from "@/lib/taikos/execution/queue-dispatcher";
import { VMB_TRIAL_COOKIE } from "@/lib/vmb/paths";

/** Routes queue execution through the stub adapter — never sends or charges. */
export async function POST(req: NextRequest) {
  const trialId = req.cookies.get(VMB_TRIAL_COOKIE)?.value?.trim();
  if (!trialId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { queueId?: string };
    if (!body.queueId?.trim()) {
      return NextResponse.json({ ok: false, error: "queueId required" }, { status: 400 });
    }

    const ctx = await buildAiosContextPacket({
      trialId,
      pathname: "/vmb/queue",
      recordLogin: false,
    });
    if (!ctx) {
      return NextResponse.json({ ok: false, error: "Workspace not found" }, { status: 404 });
    }

    const result = await executeQueueItem(trialId, ctx.operatorId, body.queueId.trim());
    if ("error" in result) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, data: result });
  } catch (err) {
    console.error("[taikos:execution:POST]", err);
    return NextResponse.json({ ok: false, error: "Execution stub failed" }, { status: 500 });
  }
}
