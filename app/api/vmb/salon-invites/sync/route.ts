export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { syncLibraryTemplatesToSalon } from "@/lib/vmb/invites/salon-invite-local-copy-store";
import { verifyVmbSalonSession } from "@/lib/vmb/salon-authority";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";

type SyncBody = { salonToken?: string };

async function resolveSalonId(req: NextRequest): Promise<string | undefined> {
  const queryToken = req.nextUrl.searchParams.get("salonToken")?.trim();
  if (queryToken) return verifyVmbSalonSession(queryToken);
  try {
    const body = (await req.clone().json()) as SyncBody;
    if (body.salonToken) return verifyVmbSalonSession(body.salonToken);
  } catch {
    // Body is optional; the salon app path uses its signed cookie.
  }
  return getVmbTrialIdFromRequest(req);
}

export async function POST(req: NextRequest) {
  const salonId = await resolveSalonId(req);
  if (!salonId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  const result = await syncLibraryTemplatesToSalon(salonId);
  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    salonId,
    copies: result.copies,
    createdCount: result.createdCount,
  });
}
