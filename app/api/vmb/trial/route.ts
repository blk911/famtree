export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  createVmbTrialLead,
  getVmbTrialLead,
  listVmbTrialLeads,
} from "@/lib/vmb/trial-store";
import { VMB_TRIAL_COOKIE } from "@/lib/vmb/paths";
import type { VmbProviderPlatform } from "@/types/vmb/trial";

const PLATFORMS: VmbProviderPlatform[] = [
  "glossgenius",
  "vagaro",
  "square",
  "fresha",
  "sola",
  "other",
];

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizePlatform(raw: unknown): VmbProviderPlatform | undefined {
  const v = String(raw ?? "").trim().toLowerCase();
  if (PLATFORMS.includes(v as VmbProviderPlatform)) return v as VmbProviderPlatform;
  return undefined;
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")?.trim();
  if (id) {
    const lead = await getVmbTrialLead(id);
    if (!lead) {
      return NextResponse.json({ ok: false, error: "Trial not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: lead });
  }
  const leads = await listVmbTrialLeads();
  return NextResponse.json({ ok: true, data: leads });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const salonName = String(body.salonName ?? "").trim();
    const ownerName = String(body.ownerName ?? body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const phone = String(body.phone ?? "").trim() || undefined;
    const providerPlatform = normalizePlatform(body.providerPlatform);

    if (!salonName) {
      return NextResponse.json({ ok: false, error: "salonName is required" }, { status: 400 });
    }
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

    const res = NextResponse.json({ ok: true, data: result.lead });
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
