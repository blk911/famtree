export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { enrichCountyOpportunityDossiers } from "@/lib/intelligence/transpo/network-formation/network-formation-engine";
import { buildNetworkFormationQuestions } from "@/lib/intelligence/transpo/network-formation/network-formation-summary";
import { buildAndPersistCountyOpportunities } from "@/lib/intelligence/transpo/opportunity-dossiers/build-county-opportunities";
import { buildCountyOpportunitySummary } from "@/lib/intelligence/transpo/opportunity-dossiers/county-opportunity-summary";
import { readCountyOpportunityCache } from "@/lib/intelligence/transpo/opportunity-dossiers/county-opportunity-store";

export async function GET() {
  try {
    let dossiers = await readCountyOpportunityCache();
    const fromCache = dossiers.length > 0;

    if (!fromCache) {
      const built = await buildAndPersistCountyOpportunities();
      dossiers = built.dossiers;
    }

    dossiers = enrichCountyOpportunityDossiers(dossiers);
    dossiers = [...dossiers].sort((a, b) => b.actionabilityScore - a.actionabilityScore);
    const summary = buildCountyOpportunitySummary(dossiers);
    const questions = buildNetworkFormationQuestions(dossiers);

    return NextResponse.json({
      ok: true,
      summary,
      dossiers,
      topImmediate: summary.topImmediate,
      questions,
      meta: { fromCache, count: dossiers.length },
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "opportunity radar failed", detail }, { status: 500 });
  }
}
