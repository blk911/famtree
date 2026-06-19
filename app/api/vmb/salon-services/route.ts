import { NextRequest, NextResponse } from "next/server";
import type { ServiceCategoryId } from "@/lib/vmb/services/canonical-catalog-types";
import type { SalonServiceLifecycleAction } from "@/lib/vmb/services/salon-service-lifecycle";
import {
  getSalonPrimaryCategory,
  getSalonServiceConfig,
  getSalonServiceConfigsForCategory,
  getSalonFacingServicesForCategory,
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

function parseLifecycleAction(raw: unknown): SalonServiceLifecycleAction {
  if (raw === "activate" || raw === "deactivate" || raw === "save") return raw;
  return "save";
}

export async function GET(request: NextRequest) {
  const salonId = getVmbTrialIdFromRequest(request);
  if (!salonId) {
    return NextResponse.json({ ok: false, error: "Salon session required" }, { status: 401 });
  }

  const categoryParam = request.nextUrl.searchParams.get("category");
  const categoryId = categoryParam ? parseCategory(categoryParam) : await getSalonPrimaryCategory(salonId);
  const configsOnly = request.nextUrl.searchParams.get("configs") === "1";

  if (configsOnly) {
    const configs = await getSalonServiceConfigsForCategory(salonId, categoryId);
    return NextResponse.json({ ok: true, categoryId, configs });
  }

  const services = await getSalonFacingServicesForCategory(salonId, categoryId);

  return NextResponse.json({ ok: true, categoryId, services });
}

export async function PUT(request: NextRequest) {
  const salonId = getVmbTrialIdFromRequest(request);
  if (!salonId) {
    return NextResponse.json({ ok: false, error: "Salon session required" }, { status: 401 });
  }

  const body = (await request.json()) as {
    catalogServiceId?: string;
    lifecycleAction?: SalonServiceLifecycleAction;
    priceCents?: number;
    durationMinutes?: number;
    enabledAddonIds?: string[];
    addonPriceCentsById?: Record<string, number>;
  };

  if (!body.catalogServiceId?.trim()) {
    return NextResponse.json({ ok: false, error: "catalogServiceId required" }, { status: 400 });
  }

  const catalogServiceId = body.catalogServiceId.trim();
  const existing = await getSalonServiceConfig(salonId, catalogServiceId);
  const lifecycleAction = parseLifecycleAction(body.lifecycleAction);

  const saved = await upsertSalonServiceConfig(salonId, {
    catalogServiceId,
    lifecycleAction,
    priceCents:
      typeof body.priceCents === "number"
        ? body.priceCents
        : (existing?.priceCents ?? 0),
    durationMinutes:
      typeof body.durationMinutes === "number"
        ? body.durationMinutes
        : (existing?.durationMinutes ?? 60),
    enabledAddonIds: Array.isArray(body.enabledAddonIds)
      ? body.enabledAddonIds
      : (existing?.enabledAddonIds ?? []),
    addonPriceCentsById:
      body.addonPriceCentsById && typeof body.addonPriceCentsById === "object"
        ? body.addonPriceCentsById
        : (existing?.addonPriceCentsById ?? {}),
  });

  if ("error" in saved) {
    const status = saved.error.includes("before activating") ? 400 : 500;
    return NextResponse.json({ ok: false, error: saved.error }, { status });
  }

  return NextResponse.json({ ok: true, config: saved.config });
}
