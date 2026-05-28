// app/api/admin/studios/styleseat/run/route.ts
// POST /api/admin/studios/styleseat/run
// Runs StyleSeat discovery and optionally the canonical identity/prospect pipeline.
// Admin-only. Not exposed to members.

export const dynamic     = "force-dynamic";
export const maxDuration = 120; // enrichment phase can take 60-90s

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runStyleSeatHarvest } from "@/lib/studios/styleseat/extract";
import { normalizeStyleSeatRecord } from "@/lib/studios/styleseat/normalize";
import { runStyleSeatPipeline } from "@/lib/studios/styleseat/resolver";
import { buildStyleSeatMarketIntelligenceReport } from "@/lib/studios/styleseat/report-builder";
import { saveStyleSeatRun, generateStyleSeatRunId, getStyleSeatArtifactPaths } from "@/lib/studios/styleseat/store";
import { getStoreBackendInfo, countProspects } from "@/lib/studios/prospects/store";
import { generateBatchId } from "@/lib/studios/prospects/from-resolver";
import type { StyleSeatHarvestContext } from "@/lib/studios/styleseat/resolver";
import type {
  StyleSeatHarvestRun,
  StyleSeatDiscoveryMode,
  StyleSeatPipelineMode,
  StyleSeatRunReport,
  StyleSeatRunResponse,
  StyleSeatErrorResponse,
  StyleSeatCategory,
  StyleSeatExtractionDiagnosticSummary,
} from "@/lib/studios/styleseat/types";
import type { ResolveMode } from "@/lib/studios/creator-lab/ig-stubs/types";

// ─── Validation schema ────────────────────────────────────────────────────────

const VALID_CATEGORIES: StyleSeatCategory[] = [
  "hair", "braids", "barber", "locs", "makeup",
  "lashes", "brows", "nails", "extensions",
];
const DEFAULT_SOURCE_URL = "https://www.styleseat.com/m/";

function normalizeCategory(input: string): StyleSeatCategory | null {
  const value = input.toLowerCase().trim().replace(/\s+/g, "_");
  const aliases: Record<string, StyleSeatCategory> = {
    hair: "hair",
    braids: "braids",
    barber: "barber",
    locs: "locs",
    makeup: "makeup",
    lashes: "lashes",
    brows: "brows",
    nails: "nails",
    extensions: "extensions",
  };
  return aliases[value] ?? null;
}

function normalizeSourceUrl(input: string): string {
  const url = new URL(input, DEFAULT_SOURCE_URL);
  if (!/(\.|^)styleseat\.com$/i.test(url.hostname)) {
    throw new Error("Only styleseat.com URLs are supported");
  }
  url.protocol = "https:";
  url.hash = "";
  for (const key of Array.from(url.searchParams.keys())) {
    const lower = key.toLowerCase();
    if (lower.startsWith("utm_") || ["fbclid", "gclid", "mc_cid", "mc_eid"].includes(lower)) {
      url.searchParams.delete(key);
    }
  }
  return url.toString();
}

const RunSchema = z.object({
  debug: z.boolean().optional().default(false),
  discoveryMode: z.enum(["aggregator_crawl", "direct_url", "market_search"]).default("aggregator_crawl"),
  sourceUrl:  z.string().max(500).optional(),
  city:       z.string().max(80).optional(),
  market:     z.string().max(80).optional(),
  state:      z.string().max(40).optional().default(""),
  categories: z.array(z.string()).optional().default([]),
  maxResults: z.number().int().min(1).max(100).optional(),
  maxOperators: z.number().int().min(1).max(100).optional(),
  crawlDepth: z.number().int().min(0).max(4).optional().default(2),
  mode:       z.enum(["fast", "deep", "harvest_only", "harvest_and_resolve", "full_pipeline"]).default("full_pipeline"),
  pipelineMode: z.enum(["harvest_only", "harvest_and_resolve", "full_pipeline"]).optional(),
  resolverMode: z.enum(["fast", "deep"]).optional().default("fast"),
});

// ─── Error helper ─────────────────────────────────────────────────────────────

function err(error: string, detail?: string, status = 400) {
  return NextResponse.json(
    { ok: false, error, detail } satisfies StyleSeatErrorResponse,
    { status }
  );
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return err("Invalid JSON body"); }

  const parsed = RunSchema.safeParse(body);
  if (!parsed.success) {
    return err("Validation error", parsed.error.errors[0]?.message);
  }

  let sourceUrl: string | null = null;
  try {
    sourceUrl = parsed.data.discoveryMode === "market_search"
      ? null
      : normalizeSourceUrl(parsed.data.sourceUrl || DEFAULT_SOURCE_URL);
  } catch (e) {
    return err("Validation error", e instanceof Error ? e.message : String(e));
  }

  const discoveryMode = parsed.data.discoveryMode as StyleSeatDiscoveryMode;
  const market = (parsed.data.city || parsed.data.market || "").trim();
  const state = (parsed.data.state || "").trim().toUpperCase();
  if (discoveryMode === "direct_url" && !parsed.data.sourceUrl) {
    return err("Validation error", "direct_url requires sourceUrl");
  }
  if (discoveryMode === "market_search" && (!market || !state)) {
    return err("Validation error", "market_search requires city and state");
  }

  const categories = parsed.data.categories
    .map(normalizeCategory)
    .filter((category): category is StyleSeatCategory => category !== null);
  const effectiveCategories = categories.length > 0 ? categories : discoveryMode === "market_search" ? ["hair"] as StyleSeatCategory[] : [];
  const maxOperators = parsed.data.maxOperators ?? parsed.data.maxResults ?? 25;
  const crawlDepth = parsed.data.crawlDepth ?? 2;
  const pipelineMode: StyleSeatPipelineMode =
    parsed.data.pipelineMode ??
    (parsed.data.mode === "fast" || parsed.data.mode === "deep"
      ? "full_pipeline"
      : parsed.data.mode);
  const resolverMode: ResolveMode =
    parsed.data.mode === "fast" || parsed.data.mode === "deep"
      ? parsed.data.mode
      : parsed.data.resolverMode;
  const runId  = generateStyleSeatRunId();
  const batchId = generateBatchId();
  const now    = new Date().toISOString();
  const errors: string[] = [];

  // ── Step 1: Capture store path + before-count ───────────────────────────────
  const backendInfo = await getStoreBackendInfo();
  const prospectStorePath = backendInfo.storePath;
  const prospectsBeforeCount = await countProspects();
  console.log(`[styleseat/run] backend=${backendInfo.backend} store=${prospectStorePath ?? "postgres"} prospectsBeforeCount=${prospectsBeforeCount}`);

  // ── Step 2: StyleSeat harvest ───────────────────────────────────────────────
  console.log(`[styleseat/run] discoveryMode=${discoveryMode} sourceUrl=${sourceUrl ?? "market"} market=${market} categories=[${effectiveCategories}] maxOperators=${maxOperators}`);
  const { operators, actorRunId, error: harvestError, crawl } = await runStyleSeatHarvest({
    runId,
    debug: parsed.data.debug,
    discoveryMode,
    sourceUrl: sourceUrl ?? undefined,
    market: market || "StyleSeat",
    state,
    categories: effectiveCategories,
    maxResults: maxOperators,
    maxOperators,
    crawlDepth,
    mode: pipelineMode,
    resolverMode,
  });

  if (harvestError) errors.push(harvestError);
  if (crawl?.debug?.notes.length) errors.push(...crawl.debug.notes);
  console.log(`[styleseat/run] harvested ${operators.length} operators`);

  const diagnosticSummary: StyleSeatExtractionDiagnosticSummary | undefined =
    parsed.data.debug && operators.length === 0
      ? {
          staticAnchorCount: crawl?.debug?.staticAnchorCount ?? 0,
          internalStyleSeatLinkCount: crawl?.debug?.internalLinkCount ?? 0,
          jsonScriptCount: crawl?.debug?.jsonScriptCount ?? 0,
          nextDataFound: crawl?.debug?.nextDataFound ?? false,
          nextFlightFound: crawl?.debug?.nextFlightFound ?? false,
          jsonLdCount: crawl?.debug?.jsonLdCount ?? 0,
          candidateObjectCount: crawl?.debug?.candidateObjectCount ?? 0,
          networkHintCount: crawl?.debug?.networkHintCount ?? 0,
          debugArtifactPath: crawl?.debug?.diagnosticsDir,
        }
      : undefined;

  // ── Step 3: IG enrichment + prospect upserts ────────────────────────────────
  const harvestCtx: StyleSeatHarvestContext = {
    runId,
    batchId,
    harvestDate:    now.slice(0, 10),
    vertical:       "beauty",
    sourcePlatform: "styleseat",
    sourceTool:     "styleseat_harvest",
    market: market || crawl?.discoveredMarkets[0] || "StyleSeat",
    state,
    categories: effectiveCategories,
  };

  const normalizedArtifact = operators.map(normalizeStyleSeatRecord);
  let pipelineResult = {
    results: [] as Awaited<ReturnType<typeof runStyleSeatPipeline>>["results"],
    normalized: [] as Awaited<ReturnType<typeof runStyleSeatPipeline>>["normalized"],
    prospects: [] as Awaited<ReturnType<typeof runStyleSeatPipeline>>["prospects"],
    savedCount: 0,
    failedToSaveCount: 0,
    saveErrors: [] as Awaited<ReturnType<typeof runStyleSeatPipeline>>["saveErrors"],
    totalIgFound: 0,
    savedHandles: [] as string[],
  };

  if (pipelineMode !== "harvest_only" && operators.length > 0) {
    try {
      pipelineResult = await runStyleSeatPipeline(operators, resolverMode, harvestCtx);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Pipeline error: ${msg}`);
      console.error("[styleseat/run] pipeline error:", msg);
    }
  } else {
    errors.push(operators.length === 0
      ? "No harvested operators: identity assembler and prospect upsert skipped."
      : "Harvest-only mode: identity assembler and prospect upsert skipped.");
  }

  const {
    results,
    normalized,
    prospects,
    savedCount,
    failedToSaveCount,
    saveErrors,
    totalIgFound,
    savedHandles,
  } = pipelineResult;

  // ── Step 4: After-count ─────────────────────────────────────────────────────
  const prospectsAfterCount = await countProspects();
  console.log(`[styleseat/run] prospectsAfter=${prospectsAfterCount} delta=+${prospectsAfterCount - prospectsBeforeCount}`);

  if (failedToSaveCount > 0) {
    errors.push(`${failedToSaveCount} operator(s) failed to save — see saveErrors`);
  }
  const runErrors = Array.from(new Set(errors));

  // ── Step 5: Build run summary ───────────────────────────────────────────────
  const run: StyleSeatHarvestRun = {
    runId,
    batchId,
    createdAt: now,
    market: market || crawl?.discoveredMarkets[0] || "StyleSeat",
    state,
    discoveryMode,
    sourceUrl,
    seedUrls: crawl?.seedUrls ?? (sourceUrl ? [sourceUrl] : []),
    crawlDepth,
    maxOperators,
    discoveredMarkets: crawl?.discoveredMarkets ?? [],
    discoveredCategories: crawl?.discoveredCategories ?? [],
    categories: effectiveCategories,
    mode: pipelineMode,
    resolverMode,
    apifyActorRunId: actorRunId,
    totalHarvested:  operators.length,
    totalIgFound,
    totalResolved:   results.filter((r) => r.resolved).length,
    totalProspects:  savedCount,
    savedCount,
    failedToSaveCount,
    saveErrors,
    errors: runErrors,
    prospectStorePath,
    prospectStoreBackend: backendInfo.backend,
    prospectsBeforeCount,
    prospectsAfterCount,
    savedHandles,
  };

  const report: StyleSeatRunReport = {
    runId,
    createdAt: now,
    discoveryMode,
    sourceUrl,
    seedUrls: crawl?.seedUrls ?? (sourceUrl ? [sourceUrl] : []),
    marketSearchInput: discoveryMode === "market_search" ? { city: market, state } : null,
    market: market || crawl?.discoveredMarkets[0] || "StyleSeat",
    categories: effectiveCategories,
    crawlDepth,
    maxOperators,
    resolverMode,
    mode: pipelineMode,
    pipelineMode,
    totals: {
      crawledUrls:       crawl?.crawledUrls.length ?? 0,
      profileUrls:       crawl?.profileUrls.length ?? operators.length,
      harvested:        operators.length,
      normalized:       normalizedArtifact.length,
      igCandidates:     totalIgFound,
      resolverMerged:   results.filter((r) => r.prospectId).length,
      prospectsCreated: savedCount,
      prospectsUpdated: 0,
      unresolved:       pipelineMode === "harvest_only" ? operators.length : results.filter((r) => r.status === "unresolved").length,
      failed:           failedToSaveCount,
    },
    artifactPaths: getStyleSeatArtifactPaths(runId),
    discoveredMarkets: crawl?.discoveredMarkets ?? [],
    discoveredCategories: crawl?.discoveredCategories ?? [],
    notes: runErrors,
  };

  const intelligence = buildStyleSeatMarketIntelligenceReport({
    run,
    crawl,
    operators,
    normalized: normalizedArtifact,
    results,
    prospects,
    failures: saveErrors,
    log: [],
    report,
  });

  report.intelligenceSummary = {
    topMarkets: intelligence.markets.slice(0, 5).map((market) => `${market.market} (${market.marketScore})`),
    topCategories: intelligence.categories.slice(0, 5).map((category) => `${category.category} (${category.count})`),
    topOperators: intelligence.operators.slice(0, 5).map((operator) => `${operator.name} (${operator.score})`),
    recommendationCount: intelligence.recommendations.length,
  };
  run.report = report;

  // ── Step 6: Persist run file ────────────────────────────────────────────────
  try {
    await saveStyleSeatRun({
      run,
      crawl,
      operators,
      normalized: normalizedArtifact,
      results,
      prospects,
      failures: saveErrors,
      intelligence,
      operatorScores: intelligence.operators,
      marketClusters: intelligence.clusters,
      log: [{
        at: now,
        mode: pipelineMode,
        resolverMode,
        backend: backendInfo.backend,
        message: "StyleSeat run completed",
      }],
      report,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[styleseat/run] save run file error:", msg);
    run.errors.push(`Run file not saved: ${msg}`);
  }

  return NextResponse.json(
    {
      ok: true,
      run,
      crawl,
      operators,
      normalized: normalizedArtifact,
      results,
      prospects,
      failures: saveErrors,
      intelligence,
      log: [{
        at: now,
        mode: pipelineMode,
        resolverMode,
        backend: backendInfo.backend,
        message: "StyleSeat run completed",
      }],
      report,
      diagnosticSummary,
    } satisfies StyleSeatRunResponse,
    { status: 200 }
  );
}
