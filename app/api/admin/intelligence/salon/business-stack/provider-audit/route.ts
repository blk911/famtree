// GET /api/admin/intelligence/salon/business-stack/provider-audit

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { buildProviderAuditReport } from "@/lib/intelligence/salon/business-stack/provider-audit";
import { buildProviderProvenanceAuditReport } from "@/lib/intelligence/salon/provider-provenance-audit";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const limit = Math.min(500, Math.max(1, Number(sp.get("limit") ?? 500)));
    const provider = sp.get("provider") ?? undefined;

    const [report, provenance] = await Promise.all([
      buildProviderAuditReport({ limit, providerFilter: provider }),
      buildProviderProvenanceAuditReport(),
    ]);

    return NextResponse.json({ ...report, provenance });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "provider_audit_failed", detail },
      { status: 500 },
    );
  }
}
