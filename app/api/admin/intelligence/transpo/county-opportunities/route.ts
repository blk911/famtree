export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { buildAndPersistCountyOpportunities } from "@/lib/intelligence/transpo/opportunity-dossiers/build-county-opportunities";
import { buildCountyOpportunitySummary } from "@/lib/intelligence/transpo/opportunity-dossiers/county-opportunity-summary";
import { readCountyOpportunityCache } from "@/lib/intelligence/transpo/opportunity-dossiers/county-opportunity-store";

export async function GET(request: NextRequest) {
  try {
    let dossiers = await readCountyOpportunityCache();
    const fromCache = dossiers.length > 0;

    if (!fromCache) {
      const built = await buildAndPersistCountyOpportunities();
      dossiers = built.dossiers;
    }

    const county = request.nextUrl.searchParams.get("county");
    const state = request.nextUrl.searchParams.get("state") ?? "CO";
    const service = request.nextUrl.searchParams.get("service");

    if (county && service) {
      const one = dossiers.find(
        (d) =>
          d.county.toLowerCase() === county.toLowerCase() &&
          d.state === state.toUpperCase() &&
          d.serviceCategory === service,
      );
      if (!one) {
        return NextResponse.json({ ok: false, error: "county opportunity not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, dossier: one });
    }

    if (county) {
      dossiers = dossiers.filter(
        (d) => d.county.toLowerCase() === county.toLowerCase() && d.state === state.toUpperCase(),
      );
    }

    const summary = buildCountyOpportunitySummary(dossiers);
    return NextResponse.json({ ok: true, summary, dossiers, meta: { fromCache, count: dossiers.length } });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "county opportunities failed", detail }, { status: 500 });
  }
}
