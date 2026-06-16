import { NextRequest, NextResponse } from "next/server";
import {
  getSalonOfferCatalogEntry,
  resolveSalonOfferDisplay,
} from "@/lib/vmb/salon-offers/salon-offer-catalog-store";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ offerId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { offerId } = await context.params;
  const salonId =
    request.nextUrl.searchParams.get("salonId")?.trim() ||
    getVmbTrialIdFromRequest(request);

  if (!salonId || !offerId?.trim()) {
    return NextResponse.json({ ok: false, error: "Salon and offer required" }, { status: 400 });
  }

  const entry = await getSalonOfferCatalogEntry(salonId, offerId.trim());
  if (!entry) {
    return NextResponse.json({ ok: false, error: "Offer not found" }, { status: 404 });
  }

  const display = await resolveSalonOfferDisplay(salonId, offerId.trim());
  return NextResponse.json({ ok: true, offer: entry, display });
}
