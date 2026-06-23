export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { templateStorageId } from "@/lib/vmb/admin/nail-template-library";
import { getDefaultNailInviteTemplate } from "@/lib/vmb/invite-templates/default-nail-invite-templates";
import { upsertInviteTemplate } from "@/lib/vmb/invite-templates/invite-template-store";
import { parseInviteTemplateSnapshot } from "@/lib/vmb/invites/invite-template-snapshot";
import { publishLibraryTemplateToSalon } from "@/lib/vmb/invites/salon-invite-local-copy-store";
import type { VmbOffer } from "@/lib/vmb/offers/offer-types";
import { upsertOffer } from "@/lib/vmb/offers/offer-store";
import { verifyVmbSalonSession } from "@/lib/vmb/salon-authority";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";

type PublishBody = { templateId?: string; salonToken?: string; offer?: VmbOffer };

function resolvePublishSalonId(req: NextRequest, body: PublishBody): string | undefined {
  if (body.salonToken?.trim()) return verifyVmbSalonSession(body.salonToken);
  return getVmbTrialIdFromRequest(req);
}

export async function POST(req: NextRequest) {
  let body: PublishBody;
  try {
    body = (await req.json()) as PublishBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const salonId = resolvePublishSalonId(req, body);
  if (!salonId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  const templateId = body.templateId?.trim();
  if (!templateId) {
    return NextResponse.json({ ok: false, error: "Missing templateId" }, { status: 400 });
  }

  if (body.offer) {
    if (body.offer.templateId !== templateId || body.offer.isDefault) {
      return NextResponse.json({ ok: false, error: "Invalid library offer" }, { status: 400 });
    }

    const baseline = getDefaultNailInviteTemplate(templateId);
    const snapshot = parseInviteTemplateSnapshot(body.offer.inviteSnapshot);
    if (!baseline || !snapshot) {
      return NextResponse.json(
        { ok: false, error: "Template is not saved to library with a snapshot." },
        { status: 400 },
      );
    }

    const savedTemplate = await upsertInviteTemplate({
      ...baseline,
      displayName: body.offer.name?.trim() || snapshot.templateName || baseline.displayName,
      headline: body.offer.headline?.trim() || snapshot.headline || baseline.headline,
      body: body.offer.body?.trim() || body.offer.offerText?.trim() || snapshot.body || baseline.body,
      ctaLabel: body.offer.ctaLabel?.trim() || snapshot.ctaLabel || baseline.ctaLabel,
      defaultPackage: {
        ...baseline.defaultPackage,
        serviceIds: body.offer.serviceIds?.length
          ? [...body.offer.serviceIds]
          : snapshot.serviceIds.length
            ? [...snapshot.serviceIds]
            : [...baseline.defaultPackage.serviceIds],
        serviceOptionIds: body.offer.serviceOptionIds?.length
          ? [...body.offer.serviceOptionIds]
          : snapshot.rewardIds.length
            ? [...snapshot.rewardIds]
            : [...baseline.defaultPackage.serviceOptionIds],
        savingsAmount: snapshot.savingsAmount ?? baseline.defaultPackage.savingsAmount,
        priceLabel: snapshot.priceLabel ?? baseline.defaultPackage.priceLabel,
        expirationLabel: snapshot.expirationLabel ?? baseline.defaultPackage.expirationLabel,
        termsText: snapshot.termsText ?? baseline.defaultPackage.termsText,
      },
      librarySnapshot: {
        ...snapshot,
        status: "library",
        sourceTemplateId: baseline.id,
        templateName: snapshot.templateName || baseline.displayName,
      },
    });
    if ("error" in savedTemplate) {
      return NextResponse.json({ ok: false, error: savedTemplate.error }, { status: 503 });
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
