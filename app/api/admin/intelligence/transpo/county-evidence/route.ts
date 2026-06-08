export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { readCountyEvidenceDossiersArtifact } from "@/lib/transpo/read-evidence-registry";
import { readCountyResearchSummaryArtifact } from "@/lib/transpo/read-research-queue";
import type { EvidenceCategory } from "@/lib/transpo/evidence-types";

export async function GET(request: NextRequest) {
  try {
    const artifact = await readCountyEvidenceDossiersArtifact();

    if (!artifact) {
      return NextResponse.json(
        {
          ok: false,
          error: "evidence registry not built",
          detail: "Run npm run build:transpo:evidence",
        },
        { status: 404 },
      );
    }

    const county = request.nextUrl.searchParams.get("county");
    const state = (request.nextUrl.searchParams.get("state") ?? "CO").toUpperCase();
    const minCompleteness = request.nextUrl.searchParams.get("minCompleteness");
    const maxCompleteness = request.nextUrl.searchParams.get("maxCompleteness");
    const missingCategory = request.nextUrl.searchParams.get(
      "missingCategory",
    ) as EvidenceCategory | null;

    let dossiers = artifact.dossiers;

    if (county) {
      const countyNorm = county.trim().replace(/\s+county$/i, "");
      dossiers = dossiers.filter(
        (d) =>
          d.county.toLowerCase() === countyNorm.toLowerCase() &&
          d.state.toUpperCase() === state,
      );
    }

    if (minCompleteness) {
      const min = Number(minCompleteness);
      if (!Number.isNaN(min)) {
        dossiers = dossiers.filter((d) => d.evidenceCompletenessScore >= min);
      }
    }

    if (maxCompleteness) {
      const max = Number(maxCompleteness);
      if (!Number.isNaN(max)) {
        dossiers = dossiers.filter((d) => d.evidenceCompletenessScore <= max);
      }
    }

    if (missingCategory) {
      dossiers = dossiers.filter((d) =>
        d.missing.some((m) => m.category === missingCategory),
      );
    }

    const totalKnown = dossiers.reduce((sum, d) => sum + d.knownCount, 0);
    const totalInferred = dossiers.reduce((sum, d) => sum + d.inferredCount, 0);
    const totalMissing = dossiers.reduce((sum, d) => sum + d.missingCount, 0);
    const avgCompleteness =
      dossiers.length > 0
        ? Math.round(
            dossiers.reduce((sum, d) => sum + d.evidenceCompletenessScore, 0) /
              dossiers.length,
          )
        : 0;

    const countyList = Array.from(
      new Set(artifact.dossiers.map((d) => d.county)),
    ).sort();

    const selectedDossier = dossiers[0] ?? null;
    const researchSummaryArtifact = await readCountyResearchSummaryArtifact();
    const countyResearchSummary = selectedDossier
      ? researchSummaryArtifact?.counties.find(
          (c) => c.countyKey === selectedDossier.countyKey,
        ) ?? null
      : null;

    return NextResponse.json({
      ok: true,
      summary: {
        counties: dossiers.length,
        knownItems: totalKnown,
        inferredItems: totalInferred,
        missingItems: totalMissing,
        averageCompleteness: avgCompleteness,
        generatedAt: artifact.generatedAt,
      },
      counties: countyList,
      dossiers,
      selectedDossier,
      countyResearchSummary,
      countySummaries: researchSummaryArtifact?.counties ?? [],
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "county evidence failed", detail },
      { status: 500 },
    );
  }
}
