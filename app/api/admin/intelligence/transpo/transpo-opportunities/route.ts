export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import type {
  TranspoOpportunityConfidence,
  TranspoOpportunityType,
} from "@/lib/transpo/opportunity-types";
import { readTranspoOpportunitiesArtifact } from "@/lib/transpo/read-transpo-opportunities";

export async function GET(request: NextRequest) {
  try {
    const artifact = await readTranspoOpportunitiesArtifact();
    if (!artifact) {
      return NextResponse.json(
        {
          ok: false,
          error: "transpo opportunities not built",
          detail: "Run npm run build:transpo:opportunities",
        },
        { status: 404 },
      );
    }

    const county = request.nextUrl.searchParams.get("county");
    const state = (request.nextUrl.searchParams.get("state") ?? "CO").toUpperCase();
    const opportunityType = request.nextUrl.searchParams.get(
      "opportunityType",
    ) as TranspoOpportunityType | null;
    const confidence = request.nextUrl.searchParams.get(
      "confidence",
    ) as TranspoOpportunityConfidence | null;
    const researchPriority = request.nextUrl.searchParams.get("researchPriority") as
      | "low"
      | "medium"
      | "high"
      | null;
    const minActionabilityRaw = request.nextUrl.searchParams.get("minActionability");
    const minActionability = minActionabilityRaw ? Number(minActionabilityRaw) : null;

    let opportunities = [...artifact.opportunities];

    if (county) {
      const countyNorm = county.trim().replace(/\s+county$/i, "");
      opportunities = opportunities.filter(
        (o) =>
          o.county.toLowerCase() === countyNorm.toLowerCase() &&
          o.state.toUpperCase() === state,
      );
    }
    if (opportunityType) {
      opportunities = opportunities.filter((o) => o.opportunityType === opportunityType);
    }
    if (confidence) {
      opportunities = opportunities.filter((o) => o.confidence === confidence);
    }
    if (researchPriority) {
      opportunities = opportunities.filter((o) => o.researchPriority === researchPriority);
    }
    if (minActionability != null && !Number.isNaN(minActionability)) {
      opportunities = opportunities.filter((o) => o.actionabilityScore >= minActionability);
    }

    const counties = Array.from(new Set(artifact.opportunities.map((o) => o.county))).sort();

    return NextResponse.json({
      ok: true,
      generatedAt: artifact.generatedAt,
      total: artifact.total,
      summary: artifact.summary,
      counties,
      opportunities,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "transpo opportunities failed", detail },
      { status: 500 },
    );
  }
}
