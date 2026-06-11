import { NextRequest, NextResponse } from "next/server";
import { recordActivity } from "@/lib/taikos/activity/activity-builder";
import { executeQueueItem } from "@/lib/taikos/execution/queue-dispatcher";
import { getQueueItemById, updateQueueItemStatus } from "@/lib/taikos/queue/queue-store";
import type { TaikosQueueStatus } from "@/lib/taikos/queue/types";
import { VMB_TRIAL_COOKIE } from "@/lib/vmb/paths";

type RouteParams = { params: Promise<{ queueId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const trialId = req.cookies.get(VMB_TRIAL_COOKIE)?.value?.trim();
  if (!trialId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  const { queueId } = await params;
  try {
    const body = (await req.json()) as {
      action?: "remove" | "archive" | "ready" | "execute";
      operatorId?: string;
    };

    const item = await getQueueItemById(trialId, queueId);
    if (!item) {
      return NextResponse.json({ ok: false, error: "Queue item not found" }, { status: 404 });
    }

    if (body.action === "execute") {
      const result = await executeQueueItem(
        trialId,
        body.operatorId?.trim() || item.operatorId,
        queueId,
      );
      if ("error" in result) {
        return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true, data: result });
    }

    let status: TaikosQueueStatus = item.status;
    if (body.action === "remove") status = "cancelled";
    if (body.action === "archive") status = "cancelled";
    if (body.action === "ready") status = "ready";

    const updated = await updateQueueItemStatus(trialId, queueId, status);
    if (!updated) {
      return NextResponse.json({ ok: false, error: "Queue update failed" }, { status: 500 });
    }

    await recordActivity({
      salonId: trialId,
      operatorId: body.operatorId?.trim() || item.operatorId,
      kind: "queue_added",
      emoji: body.action === "ready" ? "🟢" : "📦",
      headline: `Queue item ${body.action ?? "updated"}: ${item.draftTitle}`,
      linkedQueueId: queueId,
      linkedDraftId: item.draftId,
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (err) {
    console.error("[taikos:queue:PATCH]", err);
    return NextResponse.json({ ok: false, error: "Queue update failed" }, { status: 500 });
  }
}
