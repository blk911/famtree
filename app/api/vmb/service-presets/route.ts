import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import type { ServiceCategoryId } from "@/lib/vmb/services/canonical-catalog-types";
import { getSalonPrimaryCategory } from "@/lib/vmb/services/salon-service-config-store";
import {
  listServicePresetCards,
  upsertServicePresetCard,
} from "@/lib/vmb/services/service-preset-store";
import type { ServicePresetCard } from "@/lib/vmb/services/service-preset-types";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";

export const dynamic = "force-dynamic";

const CATEGORIES: ServiceCategoryId[] = [
  "nails",
  "hair",
  "lashes",
  "brows",
  "waxing",
  "skin",
  "massage",
  "barber",
];

function parseCategory(raw: string | null): ServiceCategoryId {
  const value = raw?.trim() as ServiceCategoryId | undefined;
  if (value && CATEGORIES.includes(value)) return value;
  return "nails";
}

function isAdmin(role: string): boolean {
  return role === "founder" || role === "admin";
}

export async function GET(request: NextRequest) {
  const categoryParam = request.nextUrl.searchParams.get("categoryId");
  const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "1";

  let categoryId = parseCategory(categoryParam);

  if (!categoryParam) {
    const salonId = getVmbTrialIdFromRequest(request);
    if (salonId) {
      categoryId = await getSalonPrimaryCategory(salonId);
    }
  }

  if (includeInactive) {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ ok: false, error: "Admin required" }, { status: 403 });
    }
  }

  const presets = await listServicePresetCards(categoryId, { includeInactive });
  return NextResponse.json({ ok: true, categoryId, presets });
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.role)) {
    return NextResponse.json({ ok: false, error: "Admin required" }, { status: 403 });
  }

  const body = (await request.json()) as Partial<ServicePresetCard>;
  if (!body.id?.trim() || !body.serviceOfferId?.trim() || !body.categoryId) {
    return NextResponse.json(
      { ok: false, error: "id, serviceOfferId, and categoryId required" },
      { status: 400 },
    );
  }

  const saved = await upsertServicePresetCard(body as ServicePresetCard);
  if ("error" in saved) {
    return NextResponse.json({ ok: false, error: saved.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, preset: saved.preset });
}
