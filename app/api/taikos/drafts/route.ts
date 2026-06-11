import { NextRequest, NextResponse } from "next/server";
import { createDraft, listDrafts } from "@/lib/taikos/drafts/draft-store";
import type { TaikosDraftStatus, TaikosDraftType } from "@/lib/taikos/drafts/types";
import { VMB_TRIAL_COOKIE } from "@/lib/vmb/paths";

const VALID_TYPES = new Set<string>([
  "pcn_invite",
  "campaign",
  "service_card",
  "referral_ask",
  "reactivation",
  "calendar_gap",
]);

const VALID_STATUSES = new Set<string>([
  "draft",
  "reviewed",
  "approved",
  "ready_to_send",
  "sent",
  "archived",
  "cancelled",
]);

export async function GET(req: NextRequest) {
  const trialId = req.cookies.get(VMB_TRIAL_COOKIE)?.value?.trim();
  if (!trialId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get("status")?.trim();
  const type = req.nextUrl.searchParams.get("type")?.trim();
  const limit = Number.parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10);

  if (status && !VALID_STATUSES.has(status)) {
    return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
  }
  if (type && !VALID_TYPES.has(type)) {
    return NextResponse.json({ ok: false, error: "Invalid type" }, { status: 400 });
  }

  try {
    const data = await listDrafts({
      salonId: trialId,
      status: status as TaikosDraftStatus | undefined,
      type: type as TaikosDraftType | undefined,
      limit: Number.isFinite(limit) ? limit : 20,
    });
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error("[taikos:drafts:GET]", err);
    return NextResponse.json({ ok: false, error: "Draft list failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const trialId = req.cookies.get(VMB_TRIAL_COOKIE)?.value?.trim();
  if (!trialId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      operatorId?: string;
      sourcePage?: string;
      draftType?: string;
      title?: string;
      payload?: Record<string, unknown>;
      estimatedValue?: number;
    };

    if (!body.draftType || !VALID_TYPES.has(body.draftType) || !body.title?.trim()) {
      return NextResponse.json({ ok: false, error: "Invalid draft payload" }, { status: 400 });
    }

    const draft = await createDraft({
      salonId: trialId,
      operatorId: body.operatorId?.trim() || "operator",
      sourcePage: body.sourcePage?.trim() || "/vmb/dashboard",
      draftType: body.draftType as TaikosDraftType,
      title: body.title.trim(),
      status: "draft",
      payload: body.payload ?? {},
      estimatedValue: body.estimatedValue ?? 0,
      audit: {},
    });

    return NextResponse.json({ ok: true, data: draft });
  } catch (err) {
    console.error("[taikos:drafts:POST]", err);
    return NextResponse.json({ ok: false, error: "Draft create failed" }, { status: 500 });
  }
}
