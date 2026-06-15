export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  getTemplateForType,
  getTemplatesForSalon,
  resetTemplateToDefault,
  upsertTemplateOverride,
} from "@/lib/vmb/card-templates/card-template-store";
import type { VmbCardTemplate } from "@/lib/vmb/card-templates/card-template-types";
import { VMB_CARD_TYPES } from "@/lib/vmb/cards/card-types";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";

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

  const type = req.nextUrl.searchParams.get("type")?.trim();
  if (type) {
    if (!VMB_CARD_TYPES.includes(type as (typeof VMB_CARD_TYPES)[number])) {
      return NextResponse.json({ ok: false, error: "Unknown template type" }, { status: 400 });
    }
    const template = await getTemplateForType(salonId, type as (typeof VMB_CARD_TYPES)[number]);
    return NextResponse.json({ ok: true, template });
  }

  const templates = await getTemplatesForSalon(salonId);
  return NextResponse.json({ ok: true, templates });
}

export async function PUT(req: NextRequest) {
  const salonId = resolveSalonId(req);
  if (!salonId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  let body: { template?: VmbCardTemplate };
  try {
    body = (await req.json()) as { template?: VmbCardTemplate };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const template = body.template;
  if (!template?.type || !VMB_CARD_TYPES.includes(template.type)) {
    return NextResponse.json({ ok: false, error: "Invalid template payload" }, { status: 400 });
  }

  const saved = await upsertTemplateOverride(salonId, template);
  if ("error" in saved) {
    return NextResponse.json({ ok: false, error: saved.error }, { status: 503 });
  }
  return NextResponse.json({ ok: true, template: saved.template });
}

export async function DELETE(req: NextRequest) {
  const salonId = resolveSalonId(req);
  if (!salonId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get("type")?.trim();
  if (!type || !VMB_CARD_TYPES.includes(type as (typeof VMB_CARD_TYPES)[number])) {
    return NextResponse.json({ ok: false, error: "Unknown template type" }, { status: 400 });
  }

  const reset = await resetTemplateToDefault(salonId, type as (typeof VMB_CARD_TYPES)[number]);
  if ("error" in reset) {
    return NextResponse.json({ ok: false, error: reset.error }, { status: 503 });
  }
  return NextResponse.json({ ok: true, template: reset.template });
}
