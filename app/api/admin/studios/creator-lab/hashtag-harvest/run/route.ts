// app/api/admin/studios/creator-lab/hashtag-harvest/run/route.ts
// POST /api/admin/studios/creator-lab/hashtag-harvest/run
// Runs the full hashtag harvest → resolver → prospect pipeline.

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Per-hashtag harvest (up to 100 posts × N tags) + full resolver

import { NextRequest, NextResponse } from "next/server";
import { HarvestRunRequestSchema } from "@/lib/studios/creator-lab/hashtag-harvest/schema";
import { runApifyHashtagHarvest } from "@/lib/studios/creator-lab/hashtag-harvest/apify-client";
import { computeHashtagHarvestStats, postsForHashtag } from "@/lib/studios/creator-lab/hashtag-harvest/compute-hashtag-stats";
import { extractPostCreators } from "@/lib/studios/creator-lab/hashtag-harvest/extract-post-creators";
import { normalizeCreators } from "@/lib/studios/creator-lab/hashtag-harvest/normalize-creators";
import { runResolverForSeeds } from "@/lib/studios/creator-lab/hashtag-harvest/run-resolver";
import { saveHarvestRun, generateRunId } from "@/lib/studios/creator-lab/hashtag-harvest/store";
import { generateBatchId } from "@/lib/studios/prospects/from-resolver";
import { getStoreBackendInfo, countProspects } from "@/lib/studios/prospects/store";
import type { HarvestContext } from "@/lib/studios/creator-lab/hashtag-harvest/run-resolver";
import type {
  HashtagHarvestRun,
  HarvestRunResponse,
  HarvestErrorResponse,
} from "@/lib/studios/creator-lab/hashtag-harvest/types";

function err(error: string, detail?: string, status = 400) {
  return NextResponse.json({ ok: false, error, detail } satisfies HarvestErrorResponse, { status });
}

export async function POST(req: NextRequest) {
  // ── Parse & validate ────────────────────────────────────────────────────────
  let body: unknown;
  try { body = await req.json(); }
  catch { return err("Invalid JSON body"); }

  const parsed = HarvestRunRequestSchema.safeParse(body);
  if (!parsed.success) {
    return err("Validation error", parsed.error.errors[0]?.message);
  }

  const {
    hashtags,
    market,
    category,
    maxPerHashtag,
    mode,
    runGgOnAllDeduped,
    ggMaxProbes,
    runPublicDiscovery,
  } = parsed.data;
  const verticalKey = "salon";
  const runId   = generateRunId();
  const batchId = generateBatchId();
  const now     = new Date().toISOString();
  const errors: string[] = [];

  // ── Step 1: Apify harvest ───────────────────────────────────────────────────
  const { posts, actorRunId, error: apifyError } = await runApifyHashtagHarvest(hashtags, maxPerHashtag);

  // Fatal early exit: Apify couldn't run and returned zero posts
  if (apifyError && posts.length === 0) {
    return err(apifyError, undefined, 400);
  }
  if (apifyError) {
    errors.push(apifyError);
  }

  // ── Step 2: Extract creator seeds per-hashtag (independent cap per tag) ─────
  const allSeeds = [];
  for (const hashtag of hashtags) {
    const postsForTag = postsForHashtag(posts, hashtag, maxPerHashtag);
    allSeeds.push(...extractPostCreators(postsForTag, hashtag, market, category, verticalKey));
  }

  // ── Step 3: Normalize / dedupe across all hashtags ──────────────────────────
  const normalizedCreators = normalizeCreators(allSeeds);

  // ── Step 4a: Capture store path + before-count for diagnostics ─────────────
  const backendInfo = await getStoreBackendInfo();
  const prospectStorePath = backendInfo.storePath;
  const prospectsBeforeCount = await countProspects();
  console.log(`[hashtag-harvest/run] backend=${backendInfo.backend} store=${prospectStorePath ?? "postgres"}`);
  console.log(`[hashtag-harvest/run] prospects before: ${prospectsBeforeCount}`);

  // ── Step 4: Run resolver + sequential upserts ───────────────────────────────
  const harvestCtx: HarvestContext = {
    runId,
    batchId,
    hashtags,
    harvestDate: now.slice(0, 10),
    vertical:       verticalKey,
    sourcePlatform: "instagram",
    sourceTool:     "hashtag_harvest",
  };

  let resolverResult = { results: [], savedCount: 0, failedToSaveCount: 0, saveErrors: [], upsertAttemptCount: 0, savedProspectIds: [], savedHandles: [] } as Awaited<ReturnType<typeof runResolverForSeeds>>;

  if (normalizedCreators.length > 0) {
    try {
      resolverResult = await runResolverForSeeds(normalizedCreators, mode, harvestCtx, {
        runGgOnAllDeduped,
        ggMaxProbes,
        runPublicDiscovery,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Resolver error: ${msg}`);
      console.error("[hashtag-harvest/run] resolver error:", msg);
    }
  }

  const {
    results,
    savedCount,
    failedToSaveCount,
    saveErrors,
    upsertAttemptCount,
    savedProspectIds,
    savedHandles,
    resolverDiagnostics,
  } = resolverResult;

  const { perHashtag: hashtagStats, totals: hashtagStatsTotals } = computeHashtagHarvestStats(
    hashtags,
    posts,
    allSeeds,
    normalizedCreators,
    results,
    maxPerHashtag,
  );

  // ── Step 4b: After-count for diagnostics ────────────────────────────────────
  const prospectsAfterCount = await countProspects();
  console.log(`[hashtag-harvest/run] prospects after: ${prospectsAfterCount} (delta: +${prospectsAfterCount - prospectsBeforeCount})`);
  console.log(`[hashtag-harvest/run] upsertAttempts=${upsertAttemptCount} saved=${savedCount} failed=${failedToSaveCount}`);
  console.log(`[hashtag-harvest/run] savedHandles:`, savedHandles);

  // ── Step 5: Compute summary metrics ────────────────────────────────────────
  const resolved = results.filter((r) => r.resolved);

  if (failedToSaveCount > 0) {
    errors.push(`${failedToSaveCount} prospect(s) failed to save — see saveErrors in response`);
  }

  const run: HashtagHarvestRun = {
    runId,
    createdAt: now,
    hashtags,
    market,
    category,
    mode,
    apifyActorRunId: actorRunId,
    totalPosts: posts.length,
    totalCreators: normalizedCreators.length,
    totalResolved: resolved.length,
    totalProspectsCreated: savedCount,
    totalProspectsUpdated: 0,
    savedCount,
    failedToSaveCount,
    saveErrors,
    errors,
    prospectStorePath,
    prospectStoreBackend: backendInfo.backend,
    prospectsBeforeCount,
    prospectsAfterCount,
    upsertAttemptCount,
    savedProspectIds,
    savedHandles,
    hashtagStats,
    hashtagStatsTotals,
    resolverDiagnostics: verticalKey === "salon" ? resolverDiagnostics : undefined,
  };

  // ── Step 6: Persist run file ────────────────────────────────────────────────
  try {
    await saveHarvestRun({ run, creators: normalizedCreators, results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[hashtag-harvest/run] save error:", msg);
    run.errors.push(`Run file not saved: ${msg}`);
  }

  return NextResponse.json(
    { ok: true, run, creators: normalizedCreators, results, saveErrors } satisfies HarvestRunResponse,
    { status: 200 }
  );
}
