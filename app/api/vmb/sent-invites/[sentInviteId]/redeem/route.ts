export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { redeemSentInvite } from "@/lib/vmb/invites/sent-invite-store";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";
import { toSentInviteSummaryDto } from "@/lib/vmb/invites/sent-invite-dto";

type Context = { params: Promise<{ sentInviteId: string }> };

export async function POST(request: NextRequest, context: Context) {
  const salonId = getVmbTrialIdFromRequest(request);
  if (!salonId) return NextResponse.json({ ok: false, error: "Salon session required" }, { status: 401 });
  const { sentInviteId } = await context.params;
  const result = await redeemSentInvite(salonId, sentInviteId);
  if ("error" in result) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, sentInvite: toSentInviteSummaryDto(result.sentInvite) });
}
