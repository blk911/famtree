// lib/intelligence/salon/source-ingest/sola-ingest-handoff.ts

import { buildMarketCandidatesRegistry, SOLA_SOURCE_KEY } from "@/lib/markets/build-market-candidates";
import { MARKET_CANDIDATES_ARTIFACT_PATH } from "@/lib/markets/paths";
import {
  buildSolaResolverImport,
  RESOLVER_IMPORT_ARTIFACT_PATH,
} from "@/lib/operators/sources/sola/build-resolver-import";
import {
  CANDIDATES_ARTIFACT_PATH,
  HARVEST_ARTIFACT_PATH,
  PROFILE_ENRICHMENT_ARTIFACT_PATH,
} from "@/lib/operators/sources/sola/run-sola-harvest";
import type { SalonSourceRunNextLinks, SalonSourceRunStatus } from "@/lib/studios/source-runs/types";

export type SolaIngestNextLinks = SalonSourceRunNextLinks;

export type SolaPromotionResult = {
  resolverCandidatesCreated: number;
  marketCandidatesCreated: number;
  artifactPaths: Record<string, string>;
  errors: string[];
  succeeded: boolean;
};

export type SolaIngestOutcome = {
  ok: boolean;
  status: SalonSourceRunStatus;
  harvestSucceeded: boolean;
  promotionSucceeded: boolean;
  resolverCandidatesCreated: number;
  marketCandidatesCreated: number;
  artifactPaths: Record<string, string>;
  nextLinks: SolaIngestNextLinks;
  errors: string[];
  warnings: string[];
};

export function buildSolaNextLinks(slug: string, runId: string): SolaIngestNextLinks {
  const params = new URLSearchParams({ source: "sola", location: slug });
  return {
    markets: `/admin/markets?${params.toString()}`,
    solaDetail: "/admin/markets/sola",
    viewRun: `/admin/studios/source-runs?run=${encodeURIComponent(runId)}`,
  };
}

function baseArtifactPaths(): Record<string, string> {
  return {
    harvest: HARVEST_ARTIFACT_PATH,
    operatorCandidates: CANDIDATES_ARTIFACT_PATH,
    profileEnrichment: PROFILE_ENRICHMENT_ARTIFACT_PATH,
  };
}

export async function promoteSolaHarvestToMarkets(slug: string): Promise<SolaPromotionResult> {
  const artifactPaths = baseArtifactPaths();
  const errors: string[] = [];
  let resolverCandidatesCreated = 0;
  let marketCandidatesCreated = 0;

  try {
    const resolverArtifact = await buildSolaResolverImport();
    resolverCandidatesCreated = resolverArtifact.recordCount;
    artifactPaths.resolverImport = RESOLVER_IMPORT_ARTIFACT_PATH;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`Resolver import failed: ${message}`);
    return {
      resolverCandidatesCreated: 0,
      marketCandidatesCreated: 0,
      artifactPaths,
      errors,
      succeeded: false,
    };
  }

  try {
    const { adapterResults } = await buildMarketCandidatesRegistry();
    artifactPaths.marketCandidates = MARKET_CANDIDATES_ARTIFACT_PATH;

    const solaAdapter = adapterResults.find((row) => row.sourceKey === SOLA_SOURCE_KEY);
    const slugLower = slug.toLowerCase();
    marketCandidatesCreated =
      solaAdapter?.candidates.filter(
        (candidate) => candidate.locationSlug.toLowerCase() === slugLower,
      ).length ?? 0;

    if (marketCandidatesCreated === 0 && (solaAdapter?.importedCount ?? 0) > 0) {
      marketCandidatesCreated = solaAdapter!.importedCount;
    }

    if (resolverCandidatesCreated > 0 && marketCandidatesCreated === 0) {
      errors.push(
        `Market registry built but no Sola candidates matched location slug "${slug}".`,
      );
      return {
        resolverCandidatesCreated,
        marketCandidatesCreated: 0,
        artifactPaths,
        errors,
        succeeded: false,
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`Market registry failed: ${message}`);
    return {
      resolverCandidatesCreated,
      marketCandidatesCreated: 0,
      artifactPaths,
      errors,
      succeeded: false,
    };
  }

  return {
    resolverCandidatesCreated,
    marketCandidatesCreated,
    artifactPaths,
    errors,
    succeeded: errors.length === 0,
  };
}

export function buildSolaIngestOutcome(input: {
  slug: string;
  runId: string;
  harvestSucceeded: boolean;
  listingsFound: number;
  profilesEnriched: number;
  promotion: SolaPromotionResult;
  harvestErrors?: string[];
}): SolaIngestOutcome {
  const warnings: string[] = [];
  if (process.env.VERCEL === "1") {
    warnings.push(
      "Vercel stores harvest artifacts in /tmp (ephemeral). Counts below reflect this run; open Markets from this result panel for the same session.",
    );
  }

  const errors = [...(input.harvestErrors ?? [])];
  const nextLinks = buildSolaNextLinks(input.slug, input.runId);

  if (!input.harvestSucceeded) {
    return {
      ok: false,
      status: "failed",
      harvestSucceeded: false,
      promotionSucceeded: false,
      resolverCandidatesCreated: 0,
      marketCandidatesCreated: 0,
      artifactPaths: input.promotion.artifactPaths,
      nextLinks,
      errors,
      warnings,
    };
  }

  if (!input.promotion.succeeded) {
    errors.push("Harvest succeeded, promotion failed");
    errors.push(...input.promotion.errors);
    return {
      ok: false,
      status: "harvest_only",
      harvestSucceeded: true,
      promotionSucceeded: false,
      resolverCandidatesCreated: input.promotion.resolverCandidatesCreated,
      marketCandidatesCreated: input.promotion.marketCandidatesCreated,
      artifactPaths: input.promotion.artifactPaths,
      nextLinks,
      errors,
      warnings,
    };
  }

  return {
    ok: true,
    status: "complete",
    harvestSucceeded: true,
    promotionSucceeded: true,
    resolverCandidatesCreated: input.promotion.resolverCandidatesCreated,
    marketCandidatesCreated: input.promotion.marketCandidatesCreated,
    artifactPaths: input.promotion.artifactPaths,
    nextLinks,
    errors,
    warnings,
  };
}
