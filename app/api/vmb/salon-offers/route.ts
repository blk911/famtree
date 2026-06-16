import { NextRequest, NextResponse } from "next/server";
import {
  createSalonOfferCatalogEntry,
  getEnabledSalonServicesForOffers,
  listSalonOfferCatalog,
  updateSalonOfferCatalogEntry,
} from "@/lib/vmb/salon-offers/salon-offer-catalog-store";
import type {
  CreateSalonOfferInput,
  UpdateSalonOfferInput,
} from "@/lib/vmb/salon-offers/salon-offer-catalog-types";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const salonId = getVmbTrialIdFromRequest(request);
  if (!salonId) {
    return NextResponse.json({ ok: false, error: "Salon session required" }, { status: 401 });
  }

  const includeServices = request.nextUrl.searchParams.get("services") === "1";
  const activeOnly = request.nextUrl.searchParams.get("activeOnly") === "1";

  const offers = await listSalonOfferCatalog(salonId, { activeOnly });
  const payload: {
    ok: true;
    offers: typeof offers;
    enabledServices?: Awaited<ReturnType<typeof getEnabledSalonServicesForOffers>>;
  } = { ok: true, offers };

  if (includeServices) {
    payload.enabledServices = await getEnabledSalonServicesForOffers(salonId);
  }

  return NextResponse.json(payload);
}

export async function POST(request: NextRequest) {
  const salonId = getVmbTrialIdFromRequest(request);
  if (!salonId) {
    return NextResponse.json({ ok: false, error: "Salon session required" }, { status: 401 });
  }

  const body = (await request.json()) as CreateSalonOfferInput;
  const saved = await createSalonOfferCatalogEntry(salonId, body);
  if ("error" in saved) {
    return NextResponse.json({ ok: false, error: saved.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, offer: saved.entry });
}

export async function PUT(request: NextRequest) {
  const salonId = getVmbTrialIdFromRequest(request);
  if (!salonId) {
    return NextResponse.json({ ok: false, error: "Salon session required" }, { status: 401 });
  }

  const body = (await request.json()) as UpdateSalonOfferInput & { id?: string };
  if (!body.id?.trim()) {
    return NextResponse.json({ ok: false, error: "Offer id required" }, { status: 400 });
  }

  const { id, ...patch } = body;
  const saved = await updateSalonOfferCatalogEntry(salonId, id.trim(), patch);
  if ("error" in saved) {
    return NextResponse.json({ ok: false, error: saved.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, offer: saved.entry });
}
