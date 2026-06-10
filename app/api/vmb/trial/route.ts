export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createVmbTrialLead, getVmbTrialRecord } from "@/lib/vmb/trial-store";
import { VMB_TRIAL_COOKIE } from "@/lib/vmb/paths";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
  }
  const record = await getVmbTrialRecord(id);
  if (!record) {
    return NextResponse.json({ ok: false, error: "Trial not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, record });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const salonName = String(body.salonName ?? "").trim();
    const providerPlatform = String(body.providerPlatform ?? "").trim();

    if (!name) {
      return NextResponse.json({ ok: false, error: "name is required" }, { status: 400 });
    }
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ ok: false, error: "valid email is required" }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json({ ok: false, error: "phone is required" }, { status: 400 });
    }
    if (!salonName) {
      return NextResponse.json({ ok: false, error: "salonName is required" }, { status: 400 });
    }
    if (!providerPlatform) {
      return NextResponse.json({ ok: false, error: "providerPlatform is required" }, { status: 400 });
    }

    const result = await createVmbTrialLead({
      name,
      email,
      phone,
      salonName,
      providerPlatform,
    });

    if ("error" in result) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    }

    const redirectUrl = `/vmb/trial/dashboard?trialId=${encodeURIComponent(result.lead.id)}`;
    const res = NextResponse.json({
      ok: true,
      trialId: result.lead.id,
      redirectUrl,
    });
    res.cookies.set(VMB_TRIAL_COOKIE, result.lead.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 45,
    });
    return res;
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Trial signup failed" },
      { status: 500 },
    );
  }
}
