import { NextRequest, NextResponse } from "next/server";
import type { ServiceCategoryId } from "@/lib/vmb/services/canonical-catalog-types";
import {
  getSalonPrimaryCategory,
  getSalonServicesForCategory,
  upsertSalonServiceConfig,
} from "@/lib/vmb/services/salon-service-config-store";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";

export const dynamic = "force-dynamic";

function parseCategory(raw: string | null): ServiceCategoryId {
  const value = raw?.trim() as ServiceCategoryId | undefined;
  const allowed: ServiceCategoryId[] = [
    "nails",
    "hair",
    "lashes",
    "brows",
    "waxing",
    "skin",
    "massage",
    "barber",
  ];
  if (value && allowed.includes(value)) return value;
  return "nails";
}

export async function GET(request: NextRequest) {
  const salonId = getVmbTrialIdFromRequest(request);
  if (!salonId) {
    return NextResponse.json({ ok: false, error: "Salon session required" }, { status: 401 });
  }

  const categoryParam = request.nextUrl.searchParams.get("category");
  const categoryId = categoryParam ? parseCategory(categoryParam) : await getSalonPrimaryCategory(salonId);
  const services = await getSalonServicesForCategory(salonId, categoryId);

  return NextResponse.json({ ok: true, categoryId, services });
}

export async function PUT(request: NextRequest) {
  const salonId = getVmbTrialIdFromRequest(request);
  if (!salonId) {
    return NextResponse.json({ ok: false, error: "Salon session required" }, { status: 401 });
  }

  const body = (await request.json()) as {
    catalogServiceId?: string;
    enabled?: boolean;
    priceCents?: number;
    durationMinutes?: number;
    enabledAddonIds?: string[];
  };

  if (!body.catalogServiceId?.trim()) {
    return NextResponse.json({ ok: false, error: "catalogServiceId required" }, { status: 400 });
  }

  const saved = await upsertSalonServiceConfig(salonId, {
    catalogServiceId: body.catalogServiceId.trim(),
    enabled: Boolean(body.enabled),
    priceCents: typeof body.priceCents === "number" ? body.priceCents : 0,
    durationMinutes: typeof body.durationMinutes === "number" ? body.durationMinutes : 60,
    enabledAddonIds: Array.isArray(body.enabledAddonIds) ? body.enabledAddonIds : [],
  });

  if ("error" in saved) {
    return NextResponse.json({ ok: false, error: saved.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, config: saved.config });
}
