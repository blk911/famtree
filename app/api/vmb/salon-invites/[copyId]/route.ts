export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  duplicateSalonInviteLocalCopyForSalon,
  updateSalonInviteLocalCopy,
  getSalonInviteLocalCopy,
} from "@/lib/vmb/invites/salon-invite-local-copy-store";
import type { SalonInviteInventoryStatus } from "@/lib/vmb/invites/salon-invite-inventory";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";
import { getActiveSalonServiceIds } from "@/lib/vmb/services/salon-service-config-store";

type RouteContext = { params: Promise<{ copyId: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const salonId = getVmbTrialIdFromRequest(req);
  if (!salonId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  const { copyId } = await context.params;
  const trimmedCopyId = copyId?.trim();
  if (!trimmedCopyId) {
    return NextResponse.json({ ok: false, error: "Missing copy id" }, { status: 400 });
  }

  let body: {
    inventoryStatus?: SalonInviteInventoryStatus;
    headline?: string;
    body?: string;
    ctaLabel?: string;
    serviceIds?: string[];
    rewardIds?: string[];
    totalValue?: number;
    savingsAmount?: number;
    offerPrice?: number;
    valueLabel?: string;
    priceLabel?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.inventoryStatus === "approved") {
    const existing = await getSalonInviteLocalCopy(salonId, trimmedCopyId);
    if (!existing) return NextResponse.json({ ok: false, error: "Invitation type not found" }, { status: 404 });
    const serviceIds = Array.isArray(body.serviceIds) ? body.serviceIds : existing.snapshot.serviceIds;
    const activeServiceIds = new Set(await getActiveSalonServiceIds(salonId));
    if (serviceIds.length === 0 || serviceIds.some((serviceId) => !activeServiceIds.has(serviceId))) {
      return NextResponse.json({ ok: false, error: "Approve at least one active salon service first" }, { status: 409 });
    }
  }

  const result = await updateSalonInviteLocalCopy(salonId, trimmedCopyId, {
    inventoryStatus: body.inventoryStatus,
    headline: body.headline?.trim(),
    body: body.body?.trim(),
    ctaLabel: body.ctaLabel?.trim(),
    serviceIds: body.serviceIds,
    rewardIds: body.rewardIds,
    totalValue: body.totalValue,
    savingsAmount: body.savingsAmount,
    offerPrice: body.offerPrice,
    valueLabel: body.valueLabel?.trim(),
    priceLabel: body.priceLabel?.trim(),
  });

  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    copy: result.copy,
    backend: result.backend,
    salonId,
  });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const salonId = getVmbTrialIdFromRequest(req);
  if (!salonId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  const { copyId } = await context.params;
  const trimmedCopyId = copyId?.trim();
  if (!trimmedCopyId) {
    return NextResponse.json({ ok: false, error: "Missing copy id" }, { status: 400 });
  }

  const result = await duplicateSalonInviteLocalCopyForSalon(salonId, trimmedCopyId);
  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    copy: result.copy,
    backend: result.backend,
    salonId,
  });
}
