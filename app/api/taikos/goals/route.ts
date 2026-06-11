import { NextRequest, NextResponse } from "next/server";
import { buildAiosContextPacket } from "@/lib/taikos/context/context-builder";
import { createGoal, summarizeGoalsForSalon } from "@/lib/taikos/goals/goal-store";
import type { TaikosGoalCategory } from "@/lib/taikos/goals/types";
import { VMB_TRIAL_COOKIE } from "@/lib/vmb/paths";

const VALID_CATEGORIES = new Set<string>([
  "PCN_GROWTH",
  "REFERRALS",
  "REACTIVATION",
  "OPEN_SLOT_FILL",
  "REVENUE",
  "CLIENT_RETENTION",
  "CUSTOM",
]);

export async function GET(req: NextRequest) {
  const trialId = req.cookies.get(VMB_TRIAL_COOKIE)?.value?.trim();
  if (!trialId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  try {
    const ctx = await buildAiosContextPacket({
      trialId,
      pathname: "/vmb/today",
      recordLogin: false,
    });
    if (!ctx) {
      return NextResponse.json({ ok: false, error: "Workspace not found" }, { status: 404 });
    }
    const summary = await summarizeGoalsForSalon(ctx);
    return NextResponse.json({ ok: true, data: summary });
  } catch (err) {
    console.error("[taikos:goals:GET]", err);
    return NextResponse.json({ ok: false, error: "Goals read failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const trialId = req.cookies.get(VMB_TRIAL_COOKIE)?.value?.trim();
  if (!trialId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      title?: string;
      category?: string;
      targetValue?: number;
      currentValue?: number;
      operatorId?: string;
    };
    if (!body.title?.trim() || !body.category || !VALID_CATEGORIES.has(body.category)) {
      return NextResponse.json({ ok: false, error: "Invalid goal payload" }, { status: 400 });
    }

    const goal = await createGoal({
      salonId: trialId,
      operatorId: body.operatorId?.trim() || "operator",
      title: body.title.trim(),
      category: body.category as TaikosGoalCategory,
      targetValue: body.targetValue ?? 10,
      currentValue: body.currentValue ?? 0,
      status: "active",
    });
    return NextResponse.json({ ok: true, data: goal });
  } catch (err) {
    console.error("[taikos:goals:POST]", err);
    return NextResponse.json({ ok: false, error: "Goal create failed" }, { status: 500 });
  }
}
