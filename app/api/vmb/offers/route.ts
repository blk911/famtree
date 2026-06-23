export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  archiveOffer,
  getOfferForCategory,
  getOffersForSalon,
  resetOffersToDefaults,
  upsertOffer,
} from "@/lib/vmb/offers/offer-store";
import type { VmbOffer } from "@/lib/vmb/offers/offer-types";
import { VMB_OFFER_CATEGORIES } from "@/lib/vmb/offers/offer-types";
import { verifyVmbSalonSession } from "@/lib/vmb/salon-authority";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";

function resolveSalonId(req: NextRequest): string | undefined {
  const fromToken = req.nextUrl.searchParams.get("salonToken")?.trim();
  if (fromToken) return verifyVmbSalonSession(fromToken);
  const fromQuery = req.nextUrl.searchParams.get("salonId")?.trim();
  if (fromQuery) return fromQuery;
  return getVmbTrialIdFromRequest(req) ?? undefined;
}

export async function GET(req: NextRequest) {
  const salonId = resolveSalonId(req);
  if (!salonId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  const category = req.nextUrl.searchParams.get("category")?.trim();
  if (category) {
    if (!VMB_OFFER_CATEGORIES.includes(category as (typeof VMB_OFFER_CATEGORIES)[number])) {
      return NextResponse.json({ ok: false, error: "Unknown offer category" }, { status: 400 });
    }
    const offer = await getOfferForCategory(salonId, category as (typeof VMB_OFFER_CATEGORIES)[number]);
    return NextResponse.json({ ok: true, offer });
  }

  const offers = await getOffersForSalon(salonId);
  return NextResponse.json({ ok: true, offers });
}

export async function PUT(req: NextRequest) {
  const salonId = resolveSalonId(req);
  if (!salonId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  let body: { offer?: VmbOffer };
  try {
    body = (await req.json()) as { offer?: VmbOffer };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const offer = body.offer;
  if (!offer?.category || !VMB_OFFER_CATEGORIES.includes(offer.category)) {
    return NextResponse.json({ ok: false, error: "Invalid offer payload" }, { status: 400 });
  }

  const saved = await upsertOffer(salonId, offer);
  if ("error" in saved) {
    return NextResponse.json({ ok: false, error: saved.error }, { status: 503 });
  }
  return NextResponse.json({ ok: true, offer: saved.offer });
}

export async function DELETE(req: NextRequest) {
  const salonId = resolveSalonId(req);
  if (!salonId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  const offerId = req.nextUrl.searchParams.get("offerId")?.trim();
  const reset = req.nextUrl.searchParams.get("reset") === "1";

  if (reset) {
    const result = await resetOffersToDefaults(salonId);
    if ("error" in result) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 503 });
    }
    return NextResponse.json({ ok: true, offers: result.offers });
  }

  if (!offerId) {
    return NextResponse.json({ ok: false, error: "Missing offerId" }, { status: 400 });
  }

  const archived = await archiveOffer(salonId, offerId);
  if ("error" in archived) {
    return NextResponse.json({ ok: false, error: archived.error }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
