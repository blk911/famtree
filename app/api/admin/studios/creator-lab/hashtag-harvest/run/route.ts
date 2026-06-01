// app/api/admin/studios/creator-lab/hashtag-harvest/run/route.ts
// POST /api/admin/studios/creator-lab/hashtag-harvest/run

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
import { buildHashtagHarvestDiagnostics } from "@/lib/intelligence/salon/harvest-diagnostics";
import type { HarvestContext } from "@/lib/studios/creator-lab/hashtag-harvest/run-resolver";
import type {
  HashtagHarvestRun,
  HarvestRunResponse,
  HarvestErrorResponse,
  HashtagHarvestDiagnosticsPayload,
} from "@/lib/studios/creator-lab/hashtag-harvest/types";

function err(
  error: string,
  detail?: string,
  status = 400,
  extra?: Partial<HarvestErrorResponse>,
) {
  return NextResponse.json(
    { ok: false, error, detail, ...extra } satisfies HarvestErrorResponse,
    { status },
  );
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("Invalid JSON body");
  }

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
  const runId = generateRunId();
  const batchId = generateBatchId();
  const now = new Date().toISOString();
  const errors: string[] = [];
  const warnings: string[] = [];

  const apify = await runApifyHashtagHarvest(hashtags, maxPerHashtag);

  if (!apify.apifyConnected) {
    const diagnostics = buildHashtagHarvestDiagnostics({
      hashtags,
      maxPerHashtag,
      posts: [],
      allSeeds: [],
      normalizedCreators: [],
      results: [],
      errors: [apify.error ?? "APIFY_TOKEN missing"],
      warnings: [],
      perTagApifyErrors: apify.perHashtagErrors,
      apifyConnected: false,
      apifyActorRunIds: [],
    });
    return err(apify.error ?? "APIFY_TOKEN is not set", undefined, 400, {
      hashtagsParsed: hashtags.length,
      diagnostics,
    });
  }

  if (apify.error && apify.posts.length === 0) {
    const diagnostics = buildHashtagHarvestDiagnostics({
      hashtags,
      maxPerHashtag,
      posts: [],
      allSeeds: [],
      normalizedCreators: [],
      results: [],
      errors: [apify.error],
      warnings: [],
      perTagApifyErrors: apify.perHashtagErrors,
      apifyConnected: true,
      apifyActorRunIds: apify.actorRunIds,
    });
    return err(apify.error, undefined, 400, {
      hashtagsParsed: hashtags.length,
      diagnostics,
    });
  }

  if (apify.error) {
    warnings.push(apify.error);
  }

  const posts = apify.posts;

  const allSeeds = [];
  for (const hashtag of hashtags) {
    const postsForTag = postsForHashtag(posts, hashtag, maxPerHashtag);
    if (postsForTag.length === 0 && !apify.perHashtagErrors[hashtag]) {
      warnings.push(
        `#${hashtag}: Apify returned 0 posts (check hashtag spelling or actor quota).`,
      );
    }
    allSeeds.push(
      ...extractPostCreators(postsForTag, hashtag, market, category, verticalKey),
    );
  }

  const normalizedCreators = normalizeCreators(allSeeds);

  if (normalizedCreators.length === 0 && posts.length > 0) {
    warnings.push(
      "Posts were returned but no creator handles could be extracted — check Apify post shape (ownerUsername).",
    );
  }

  const backendInfo = await getStoreBackendInfo();
  const prospectStorePath = backendInfo.storePath;
  const prospectsBeforeCount = await countProspects();

  const harvestCtx: HarvestContext = {
    runId,
    batchId,
    hashtags,
    harvestDate: now.slice(0, 10),
    vertical: verticalKey,
    sourcePlatform: "instagram",
    sourceTool: "hashtag_harvest",
  };

  let resolverResult = {
    results: [],
    savedCount: 0,
    failedToSaveCount: 0,
    saveErrors: [],
    upsertAttemptCount: 0,
    savedProspectIds: [],
    savedHandles: [],
  } as Awaited<ReturnType<typeof runResolverForSeeds>>;

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

  const { perHashtag: hashtagStats, totals: hashtagStatsTotals } =
    computeHashtagHarvestStats(
      hashtags,
      posts,
      allSeeds,
      normalizedCreators,
      results,
      maxPerHashtag,
    );

  const prospectsAfterCount = await countProspects();

  const resolved = results.filter((r) => r.resolved);

  if (failedToSaveCount > 0) {
    errors.push(`${failedToSaveCount} prospect(s) failed to save — see saveErrors in response`);
  }

  const diagnostics = buildHashtagHarvestDiagnostics({
    hashtags,
    maxPerHashtag,
    posts,
    allSeeds,
    normalizedCreators,
    results,
    errors,
    warnings,
    perTagApifyErrors: apify.perHashtagErrors,
    apifyConnected: apify.apifyConnected,
    apifyActorRunIds: apify.actorRunIds,
  });

  const run: HashtagHarvestRun = {
    runId,
    createdAt: now,
    hashtags,
    market,
    category,
    mode,
    apifyActorRunId: apify.actorRunId,
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

  try {
    await saveHarvestRun({ run, creators: normalizedCreators, results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[hashtag-harvest/run] save error:", msg);
    run.errors.push(`Run file not saved: ${msg}`);
    diagnostics.warnings.push(`Run file not saved: ${msg}`);
  }

  return NextResponse.json({
    ok: true,
    run,
    creators: normalizedCreators,
    results,
    saveErrors,
    hashtagsParsed: hashtags.length,
    diagnostics,
  } satisfies HarvestRunResponse);
}
