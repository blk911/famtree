export const dynamic = "force-dynamic";



import { NextRequest, NextResponse } from "next/server";

import { publishLibraryTemplateToSalon } from "@/lib/vmb/invites/salon-invite-local-copy-store";

import { templateStorageId } from "@/lib/vmb/admin/nail-template-library";

import { upsertOffer } from "@/lib/vmb/offers/offer-store";

import type { VmbOffer } from "@/lib/vmb/offers/offer-types";

import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";



export async function POST(req: NextRequest) {

  const salonId = getVmbTrialIdFromRequest(req);

  if (!salonId) {

    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });

  }



  let body: { templateId?: string; offer?: VmbOffer };

  try {

    body = (await req.json()) as { templateId?: string; offer?: VmbOffer };

  } catch {

    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });

  }



  const templateId = body.templateId?.trim();

  if (!templateId) {

    return NextResponse.json({ ok: false, error: "Missing templateId" }, { status: 400 });

  }

  if (body.offer) {
    if (body.offer.templateId !== templateId || body.offer.isDefault) {
      return NextResponse.json({ ok: false, error: "Invalid library offer" }, { status: 400 });
    }

    const saved = await upsertOffer(salonId, {
      ...body.offer,
      id: templateStorageId(salonId, templateId),
      salonId,
    });
    if ("error" in saved) {
      return NextResponse.json({ ok: false, error: saved.error }, { status: 503 });
    }
  }



  const result = await publishLibraryTemplateToSalon(salonId, templateId);

  if ("error" in result) {

    return NextResponse.json({ ok: false, error: result.error }, { status: 503 });

  }



  return NextResponse.json({

    ok: true,

    copy: result.copy,

    backend: result.backend,

    salonId,

    copyId: result.copy.id,

    sourceTemplateId: result.copy.sourceTemplateId,

    publishedVersion: result.copy.publishedVersion,

  });

}
