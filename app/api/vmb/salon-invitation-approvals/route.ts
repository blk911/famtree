export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  approveSalonInvitation,
  listSalonInvitationApprovals,
  pauseSalonInvitationApproval,
  prepareSalonInvitationForSend,
} from "@/lib/vmb/invites/salon-invitation-approval-store";
import type { CreateSalonInvitationApprovalInput } from "@/types/vmb/salon-invitation-approval";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";

export async function GET(req: NextRequest) {
  const salonId = getVmbTrialIdFromRequest(req);
  if (!salonId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  const approvals = await listSalonInvitationApprovals(salonId);
  return NextResponse.json({ ok: true, salonId, approvals });
}

export async function POST(req: NextRequest) {
  const salonId = getVmbTrialIdFromRequest(req);
  if (!salonId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  let body: {
    action?: "approve" | "pause";
    intent?: "send";
    clientName?: string;
    clientEmail?: string;
    opportunityId?: string;
    opportunityType?: string;
    sourceCopyId?: string;
    sourceTemplateId?: string;
    salonOfferCatalogId?: string;
    snapshot?: CreateSalonInvitationApprovalInput["snapshot"];
    reasonText?: string;
    estimatedValue?: number;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const action = body.action;
  if (action !== "approve" && action !== "pause") {
    return NextResponse.json({ ok: false, error: "Missing or invalid action" }, { status: 400 });
  }

  const clientName = body.clientName?.trim();
  const opportunityType = body.opportunityType?.trim();
  const sourceCopyId = body.sourceCopyId?.trim();
  const sourceTemplateId = body.sourceTemplateId?.trim();
  const reasonText = body.reasonText?.trim();
  const snapshot = body.snapshot;

  if (!clientName || !opportunityType || !sourceCopyId || !sourceTemplateId || !reasonText || !snapshot) {
    return NextResponse.json({ ok: false, error: "Missing required approval fields" }, { status: 400 });
  }

  const input: CreateSalonInvitationApprovalInput = {
    clientName,
    clientEmail: body.clientEmail?.trim(),
    opportunityId: body.opportunityId?.trim(),
    opportunityType,
    sourceCopyId,
    sourceTemplateId,
    salonOfferCatalogId: body.salonOfferCatalogId?.trim(),
    snapshot,
    reasonText,
    estimatedValue: body.estimatedValue,
    status: action === "approve" ? "approved" : "paused",
  };

  const result =
    action === "approve" && body.intent === "send"
      ? await prepareSalonInvitationForSend(salonId, input)
      : action === "approve"
      ? await approveSalonInvitation(salonId, input)
      : await pauseSalonInvitationApproval(salonId, input);

  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    approval: result.approval,
    created: result.created,
    salonId,
  });
}
