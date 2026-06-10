export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { patchInviteDraftForTrial } from "@/lib/vmb/invite-drafts/invite-draft-store";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";
import type { InviteDraftStatus } from "@/types/vmb/invite-draft";

const VALID_STATUSES: InviteDraftStatus[] = ["draft", "approved", "skipped", "sent"];

type RouteContext = { params: Promise<{ draftId: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const trialId = getVmbTrialIdFromRequest(req);
    if (!trialId) {
      return NextResponse.json({ ok: false, error: "Trial session required" }, { status: 401 });
    }

    const { draftId } = await context.params;
    const body = (await req.json()) as Record<string, unknown>;
    const bodyTrialId = String(body.trialId ?? "").trim();
    if (bodyTrialId && bodyTrialId !== trialId) {
      return NextResponse.json(
        { ok: false, error: "trialId does not match current trial session" },
        { status: 403 },
      );
    }

    const statusRaw = body.status !== undefined ? String(body.status).trim() : undefined;
    if (statusRaw && !VALID_STATUSES.includes(statusRaw as InviteDraftStatus)) {
      return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
    }

    const editableMessage =
      body.editableMessage !== undefined ? String(body.editableMessage) : undefined;

    const result = await patchInviteDraftForTrial(draftId, trialId, {
      status: statusRaw as InviteDraftStatus | undefined,
      editableMessage,
    });

    if ("error" in result) {
      const status = result.error === "Draft not found" ? 404 : 500;
      return NextResponse.json({ ok: false, error: result.error }, { status });
    }

    return NextResponse.json({ ok: true, data: result.draft });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 },
    );
  }
}
