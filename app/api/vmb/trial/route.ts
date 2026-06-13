export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createVmbTrialLead, getVmbTrialLead } from "@/lib/vmb/trial-store";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";
import { upsertWorkspaceForTrial } from "@/lib/vmb/workspace-store";
import { applyVmbTrialCookie } from "@/lib/vmb/trial-cookie-options";
import { VMB_PROVIDER_PLATFORMS } from "@/lib/vmb/provider-guide";
import type { VmbProviderPlatform } from "@/types/vmb/trial";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizePlatform(raw: unknown): VmbProviderPlatform | undefined {
  const v = String(raw ?? "").trim().toLowerCase();
  if (VMB_PROVIDER_PLATFORMS.includes(v as VmbProviderPlatform)) return v as VmbProviderPlatform;
  return undefined;
}

export async function GET(req: NextRequest) {
  const trialId = getVmbTrialIdFromRequest(req);
  if (!trialId) {
    return NextResponse.json({ ok: false, error: "No trial session" }, { status: 401 });
  }

  const lead = await getVmbTrialLead(trialId);
  if (!lead || lead.id !== trialId) {
    return NextResponse.json({ ok: false, error: "Trial not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: lead });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const salonName = String(body.salonName ?? "").trim() || "Your Salon";
    const ownerName = String(body.ownerName ?? body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const phone = String(body.phone ?? "").trim() || undefined;
    const providerPlatform = normalizePlatform(body.providerPlatform);
    if (!ownerName) {
      return NextResponse.json({ ok: false, error: "ownerName is required" }, { status: 400 });
    }
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ ok: false, error: "valid email is required" }, { status: 400 });
    }

    const result = await createVmbTrialLead({
      salonName,
      ownerName,
      email,
      phone,
      providerPlatform,
    });

    if ("error" in result) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    }

    const workspaceResult = await upsertWorkspaceForTrial({
      trialId: result.lead.id,
      salonName,
      ownerName,
      email,
      providerPlatform,
    });
    if ("error" in workspaceResult) {
      return NextResponse.json({ ok: false, error: workspaceResult.error }, { status: 500 });
    }

    const res = NextResponse.json({ ok: true, data: result.lead });
    applyVmbTrialCookie(res, result.lead.id);
    return res;
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Trial signup failed" },
      { status: 500 },
    );
  }
}
