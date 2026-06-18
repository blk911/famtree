export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { publishLibraryTemplateToSalon } from "@/lib/vmb/invites/salon-invite-local-copy-store";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";

export async function POST(req: NextRequest) {
  const salonId = getVmbTrialIdFromRequest(req);
  if (!salonId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  let body: { templateId?: string };
  try {
    body = (await req.json()) as { templateId?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const templateId = body.templateId?.trim();
  if (!templateId) {
    return NextResponse.json({ ok: false, error: "Missing templateId" }, { status: 400 });
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
