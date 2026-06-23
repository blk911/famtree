export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  archiveOption,
  archiveService,
  getAllOptionsForSalon,
  getOptionsForService,
  getServicesForSalon,
  upsertService,
  upsertServiceOption,
} from "@/lib/vmb/services/service-store";
import type { VmbServiceOption } from "@/lib/vmb/services/service-option-types";
import type { VmbService } from "@/lib/vmb/services/service-types";
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

  const serviceId = req.nextUrl.searchParams.get("serviceId")?.trim();
  if (serviceId) {
    const options = await getOptionsForService(salonId, serviceId);
    return NextResponse.json({ ok: true, options });
  }

  const services = await getServicesForSalon(salonId);
  const options = await getAllOptionsForSalon(salonId);
  return NextResponse.json({ ok: true, services, options });
}

export async function PUT(req: NextRequest) {
  const salonId = resolveSalonId(req);
  if (!salonId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  let body: { service?: VmbService; option?: VmbServiceOption };
  try {
    body = (await req.json()) as { service?: VmbService; option?: VmbServiceOption };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.service) {
    const saved = await upsertService(salonId, body.service);
    if ("error" in saved) {
      return NextResponse.json({ ok: false, error: saved.error }, { status: 503 });
    }
    return NextResponse.json({ ok: true, service: saved.service });
  }

  if (body.option) {
    const saved = await upsertServiceOption(salonId, body.option);
    if ("error" in saved) {
      return NextResponse.json({ ok: false, error: saved.error }, { status: 503 });
    }
    return NextResponse.json({ ok: true, option: saved.option });
  }

  return NextResponse.json({ ok: false, error: "Missing service or option payload" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const salonId = resolveSalonId(req);
  if (!salonId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  const serviceId = req.nextUrl.searchParams.get("serviceId")?.trim();
  const optionId = req.nextUrl.searchParams.get("optionId")?.trim();

  if (optionId) {
    const archived = await archiveOption(salonId, optionId);
    if ("error" in archived) {
      return NextResponse.json({ ok: false, error: archived.error }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  }

  if (serviceId) {
    const archived = await archiveService(salonId, serviceId);
    if ("error" in archived) {
      return NextResponse.json({ ok: false, error: archived.error }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "Missing serviceId or optionId" }, { status: 400 });
}
