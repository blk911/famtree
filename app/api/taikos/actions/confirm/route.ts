import { NextRequest, NextResponse } from "next/server";
import { confirmTaikosAction } from "@/lib/taikos/actions/action-dispatcher";
import type { TaikosActionType } from "@/lib/taikos/types";
import { buildAiosContextPacket } from "@/lib/taikos/context/context-builder";
import { VMB_TRIAL_COOKIE } from "@/lib/vmb/paths";

const VALID_TYPES = new Set<string>([
  "CREATE_INVITE_DRAFT",
  "CREATE_SERVICE_CARD_DRAFT",
  "CREATE_CAMPAIGN_DRAFT",
  "VIEW_CLIENT_SEGMENT",
  "VIEW_CALENDAR_GAP",
  "CONTINUE_PCN_INVITES",
  "PREVIEW_REFERRAL_ASK",
  "PREVIEW_REACTIVATION_MESSAGE",
  "REFRESH_BOOK_ANALYSIS",
]);

export async function POST(req: NextRequest) {
  const trialId = req.cookies.get(VMB_TRIAL_COOKIE)?.value?.trim();
  if (!trialId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  const body = (await req.json()) as {
    actionType?: string;
    previewId?: string;
    pathname?: string;
    analysisId?: string;
    payload?: Record<string, string>;
    sourceRecommendationId?: string;
  };

  if (!body.actionType || !VALID_TYPES.has(body.actionType) || !body.previewId) {
    return NextResponse.json({ ok: false, error: "Invalid confirm payload" }, { status: 400 });
  }

  try {
    const ctx = await buildAiosContextPacket({
      trialId,
      pathname: body.pathname?.trim() || "/vmb/dashboard",
      analysisId: body.analysisId?.trim(),
      recordLogin: false,
    });
    if (!ctx) {
      return NextResponse.json({ ok: false, error: "Workspace not found" }, { status: 404 });
    }

    const result = await confirmTaikosAction(body.actionType as TaikosActionType, ctx, {
      previewId: body.previewId,
      sourcePage: body.pathname?.trim() || "/vmb/dashboard",
      sourceRecommendationId: body.sourceRecommendationId,
      payload: body.payload,
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (err) {
    console.error("[taikos:actions:confirm]", err);
    return NextResponse.json({ ok: false, error: "Confirm failed" }, { status: 500 });
  }
}
