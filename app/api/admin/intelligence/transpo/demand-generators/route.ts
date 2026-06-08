export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { readCountyDemandDossiersArtifact, readDemandGeneratorsArtifact } from "@/lib/transpo/read-demand-registry";
import { readCountyGapAnalysisArtifact } from "@/lib/transpo/read-provider-registry";
import type { DemandGeneratorCategory } from "@/lib/transpo/types";

export async function GET(request: NextRequest) {
  try {
    const registry = await readDemandGeneratorsArtifact();
    const dossiersArtifact = await readCountyDemandDossiersArtifact();

    if (!registry || !dossiersArtifact) {
      return NextResponse.json(
        {
          ok: false,
          error: "demand registry not built",
          detail: "Run npm run build:transpo",
        },
        { status: 404 },
      );
    }

    const county = request.nextUrl.searchParams.get("county");
    const state = (request.nextUrl.searchParams.get("state") ?? "CO").toUpperCase();
    const category = request.nextUrl.searchParams.get("category") as DemandGeneratorCategory | null;

    let generators = registry.generators;
    let dossiers = dossiersArtifact.dossiers;

    if (county) {
      const countyNorm = county.trim().replace(/\s+county$/i, "");
      generators = generators.filter(
        (g) =>
          g.county.toLowerCase() === countyNorm.toLowerCase() &&
          g.state.toUpperCase() === state,
      );
      dossiers = dossiers.filter(
        (d) =>
          d.county.toLowerCase() === countyNorm.toLowerCase() &&
          d.state.toUpperCase() === state,
      );
    }

    if (category) {
      generators = generators.filter((g) => g.category === category);
    }

    const hospitalAnchors = registry.generators.filter((g) => g.category === "hospital").length;
    const dialysisAnchors = registry.generators.filter((g) => g.category === "dialysis").length;
    const gapArtifact = await readCountyGapAnalysisArtifact();
    const selectedDossier = dossiers[0] ?? null;
    const selectedGap = selectedDossier
      ? gapArtifact?.counties.find((g) => g.countyKey === selectedDossier.countyKey) ?? null
      : null;

    return NextResponse.json({
      ok: true,
      summary: {
        totalGenerators: registry.total,
        countiesCovered: dossiersArtifact.totalCounties,
        hospitalAnchors,
        dialysisAnchors,
        generatedAt: registry.generatedAt,
      },
      generators,
      dossiers,
      selectedDossier,
      selectedGap,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "demand generators failed", detail },
      { status: 500 },
    );
  }
}
