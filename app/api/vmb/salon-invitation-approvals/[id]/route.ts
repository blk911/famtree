export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { updateSalonInvitationApprovalStatus } from "@/lib/vmb/invites/salon-invitation-approval-store";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const salonId = getVmbTrialIdFromRequest(req);
  if (!salonId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  const { id } = await context.params;
  const approvalId = id?.trim();
  if (!approvalId) {
    return NextResponse.json({ ok: false, error: "Missing approval id" }, { status: 400 });
  }

  let body: { action?: "pause" | "resume" };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.action === "pause") {
    const result = await updateSalonInvitationApprovalStatus(salonId, approvalId, "paused");
    if ("error" in result) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 503 });
    }
    return NextResponse.json({ ok: true, approval: result.approval, salonId });
  }

  if (body.action === "resume") {
    const result = await updateSalonInvitationApprovalStatus(salonId, approvalId, "approved");
    if ("error" in result) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 503 });
    }
    return NextResponse.json({ ok: true, approval: result.approval, salonId });
  }

  return NextResponse.json({ ok: false, error: "Missing or invalid action" }, { status: 400 });
}
