// GET /api/admin/intelligence/salon/qualified-operators

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { listQualifiedOperators } from "@/lib/intelligence/salon/qualified-operator/list";
import type { QualificationStatus } from "@/lib/intelligence/salon/qualified-operator/types";

const STATUSES = new Set([
  "campaign_ready",
  "qualified",
  "needs_enrichment",
  "prospect_only",
  "rejected",
  "all",
]);

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const limit = Math.min(500, Math.max(1, Number(sp.get("limit") ?? 500)));
    const statusRaw = sp.get("status") ?? "all";
    const status = STATUSES.has(statusRaw)
      ? (statusRaw as QualificationStatus | "all")
      : "all";
    const provider = sp.get("provider") ?? undefined;
    const category = sp.get("category") ?? undefined;

    const { operators, summary } = await listQualifiedOperators({
      limit,
      status: status === "all" ? undefined : status,
      provider,
      category,
    });

    return NextResponse.json({
      ok: true,
      operators,
      summary,
      total: operators.length,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "qualified_operators_failed", detail },
      { status: 500 },
    );
  }
}
