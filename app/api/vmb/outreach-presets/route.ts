export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  getActiveOutreachPresetForCategory,
  getOutreachPresetsForSalon,
  resetOutreachPresetToDefault,
  upsertOutreachPresetOverride,
} from "@/lib/vmb/invites/outreach-preset-store";
import type { OutreachMessagePresetId } from "@/lib/vmb/invites/outreach-message-presets";
import { listOutreachMessagePresets } from "@/lib/vmb/invites/outreach-message-presets";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";

const PRESET_IDS = new Set(listOutreachMessagePresets().map((preset) => preset.id));

function resolveSalonId(req: NextRequest): string | undefined {
  const fromQuery = req.nextUrl.searchParams.get("salonId")?.trim();
  if (fromQuery) return fromQuery;
  return getVmbTrialIdFromRequest(req) ?? undefined;
}

export async function GET(req: NextRequest) {
  const salonId = resolveSalonId(req);
  if (!salonId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  const category = req.nextUrl.searchParams.get("category")?.trim() as OutreachMessagePresetId | undefined;
  if (category) {
    if (!PRESET_IDS.has(category)) {
      return NextResponse.json({ ok: false, error: "Unknown outreach preset category" }, { status: 400 });
    }
    const preset = await getActiveOutreachPresetForCategory(salonId, category);
    return NextResponse.json({ ok: true, preset });
  }

  const presets = await getOutreachPresetsForSalon(salonId);
  return NextResponse.json({ ok: true, presets });
}

export async function PUT(req: NextRequest) {
  const salonId = resolveSalonId(req);
  if (!salonId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  let body: { preset?: { id?: OutreachMessagePresetId } & Record<string, unknown> };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const id = body.preset?.id;
  if (!id || !PRESET_IDS.has(id)) {
    return NextResponse.json({ ok: false, error: "Invalid outreach preset payload" }, { status: 400 });
  }

  const saved = await upsertOutreachPresetOverride(salonId, {
    id,
    label: typeof body.preset?.label === "string" ? body.preset.label : undefined,
    description: typeof body.preset?.description === "string" ? body.preset.description : undefined,
    subjectTemplate:
      typeof body.preset?.subjectTemplate === "string" ? body.preset.subjectTemplate : undefined,
    messageTemplate:
      typeof body.preset?.messageTemplate === "string" ? body.preset.messageTemplate : undefined,
    lockedFooterTemplate:
      typeof body.preset?.lockedFooterTemplate === "string"
        ? body.preset.lockedFooterTemplate
        : undefined,
    primaryCtaLabel:
      typeof body.preset?.primaryCtaLabel === "string" ? body.preset.primaryCtaLabel : undefined,
    channelHintSms:
      typeof body.preset?.channelHintSms === "string" ? body.preset.channelHintSms : undefined,
    channelHintEmail:
      typeof body.preset?.channelHintEmail === "string" ? body.preset.channelHintEmail : undefined,
    active: typeof body.preset?.active === "boolean" ? body.preset.active : undefined,
  });

  if ("error" in saved) {
    return NextResponse.json({ ok: false, error: saved.error }, { status: 503 });
  }
  return NextResponse.json({ ok: true, preset: saved.preset });
}

export async function DELETE(req: NextRequest) {
  const salonId = resolveSalonId(req);
  if (!salonId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id")?.trim() as OutreachMessagePresetId | undefined;
  if (!id || !PRESET_IDS.has(id)) {
    return NextResponse.json({ ok: false, error: "Missing or invalid preset id" }, { status: 400 });
  }

  const reset = await resetOutreachPresetToDefault(salonId, id);
  if ("error" in reset) {
    return NextResponse.json({ ok: false, error: reset.error }, { status: 503 });
  }
  return NextResponse.json({ ok: true, preset: reset.preset });
}
