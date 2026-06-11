import { NextRequest, NextResponse } from "next/server";
import { recordActivity } from "@/lib/taikos/activity/activity-builder";
import { getGoalById, updateGoal } from "@/lib/taikos/goals/goal-store";
import type { TaikosGoalCategory, TaikosGoalPriority, TaikosGoalStatus } from "@/lib/taikos/goals/types";
import { VMB_TRIAL_COOKIE } from "@/lib/vmb/paths";

type RouteParams = { params: Promise<{ goalId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const trialId = req.cookies.get(VMB_TRIAL_COOKIE)?.value?.trim();
  if (!trialId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  const { goalId } = await params;
  try {
    const body = (await req.json()) as {
      title?: string;
      category?: TaikosGoalCategory;
      targetValue?: number;
      currentValue?: number;
      status?: TaikosGoalStatus;
      deadline?: string;
      priority?: TaikosGoalPriority;
      notes?: string;
      operatorId?: string;
    };

    const existing = await getGoalById(trialId, goalId);
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Goal not found" }, { status: 404 });
    }

    const updated = await updateGoal(trialId, goalId, body);
    if (!updated) {
      return NextResponse.json({ ok: false, error: "Goal update failed" }, { status: 500 });
    }

    await recordActivity({
      salonId: trialId,
      operatorId: body.operatorId?.trim() || existing.operatorId,
      kind: "goal_progress",
      emoji: "🎯",
      headline: `Goal updated: ${updated.title}`,
      detail: `${updated.currentValue} of ${updated.targetValue} (${updated.progressPercent}%)`,
      linkedGoalId: updated.goalId,
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (err) {
    console.error("[taikos:goals:PATCH]", err);
    return NextResponse.json({ ok: false, error: "Goal update failed" }, { status: 500 });
  }
}
