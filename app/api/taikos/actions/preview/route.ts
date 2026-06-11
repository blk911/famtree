import { NextRequest, NextResponse } from "next/server";
import { previewTaikosAction } from "@/lib/taikos/actions/action-dispatcher";
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
    pathname?: string;
    analysisId?: string;
    payload?: Record<string, string>;
  };

  if (!body.actionType || !VALID_TYPES.has(body.actionType)) {
    return NextResponse.json({ ok: false, error: "Invalid action type" }, { status: 400 });
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

    const preview = previewTaikosAction(
      body.actionType as TaikosActionType,
      ctx,
      body.payload,
    );

    return NextResponse.json({ ok: true, data: preview });
  } catch (err) {
    console.error("[taikos:actions:preview]", err);
    return NextResponse.json({ ok: false, error: "Preview failed" }, { status: 500 });
  }
}
