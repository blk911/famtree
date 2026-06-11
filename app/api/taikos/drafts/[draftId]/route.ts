import { NextRequest, NextResponse } from "next/server";
import { archiveDraft, getDraftById, updateDraft } from "@/lib/taikos/drafts/draft-store";
import type { TaikosDraftStatus } from "@/lib/taikos/drafts/types";
import { VMB_TRIAL_COOKIE } from "@/lib/vmb/paths";

const VALID_STATUSES = new Set<string>([
  "draft",
  "reviewed",
  "approved",
  "ready_to_send",
  "sent",
  "archived",
  "cancelled",
]);

type RouteContext = { params: Promise<{ draftId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const trialId = req.cookies.get(VMB_TRIAL_COOKIE)?.value?.trim();
  if (!trialId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  const { draftId } = await context.params;
  try {
    const draft = await getDraftById(trialId, draftId);
    if (!draft) {
      return NextResponse.json({ ok: false, error: "Draft not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: draft });
  } catch (err) {
    console.error("[taikos:drafts:GET:id]", err);
    return NextResponse.json({ ok: false, error: "Draft read failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const trialId = req.cookies.get(VMB_TRIAL_COOKIE)?.value?.trim();
  if (!trialId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  const { draftId } = await context.params;
  const body = (await req.json()) as {
    title?: string;
    status?: string;
    payload?: Record<string, unknown>;
    estimatedValue?: number;
  };

  if (body.status && !VALID_STATUSES.has(body.status)) {
    return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
  }

  try {
    const draft = await updateDraft(trialId, draftId, {
      title: body.title?.trim(),
      status: body.status as TaikosDraftStatus | undefined,
      payload: body.payload,
      estimatedValue: body.estimatedValue,
    });
    if (!draft) {
      return NextResponse.json({ ok: false, error: "Draft not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: draft });
  } catch (err) {
    console.error("[taikos:drafts:PATCH]", err);
    return NextResponse.json({ ok: false, error: "Draft update failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const trialId = req.cookies.get(VMB_TRIAL_COOKIE)?.value?.trim();
  if (!trialId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  const { draftId } = await context.params;
  try {
    const draft = await archiveDraft(trialId, draftId);
    if (!draft) {
      return NextResponse.json({ ok: false, error: "Draft not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: draft });
  } catch (err) {
    console.error("[taikos:drafts:DELETE]", err);
    return NextResponse.json({ ok: false, error: "Draft archive failed" }, { status: 500 });
  }
}
