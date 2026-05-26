// app/api/admin/studios/creator-lab/hashtag-harvest/run/route.ts
// POST /api/admin/studios/creator-lab/hashtag-harvest/run
// Runs the full hashtag harvest → resolver → prospect pipeline.

export const dynamic = "force-dynamic";
export const maxDuration = 120; // Apify + resolver can take 60-90s combined

import { NextRequest, NextResponse } from "next/server";
import { HarvestRunRequestSchema } from "@/lib/studios/creator-lab/hashtag-harvest/schema";
import { runApifyHashtagHarvest } from "@/lib/studios/creator-lab/hashtag-harvest/apify-client";
import { extractPostCreators } from "@/lib/studios/creator-lab/hashtag-harvest/extract-post-creators";
import { normalizeCreators } from "@/lib/studios/creator-lab/hashtag-harvest/normalize-creators";
import { runResolverForSeeds } from "@/lib/studios/creator-lab/hashtag-harvest/run-resolver";
import { saveHarvestRun, generateRunId } from "@/lib/studios/creator-lab/hashtag-harvest/store";
import { generateBatchId } from "@/lib/studios/prospects/from-resolver";
import type {
  HashtagHarvestRun,
  HarvestRunResponse,
  HarvestErrorResponse,
  ResolverPipelineResult,
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

  const { hashtags, market, category, maxPerHashtag, mode } = parsed.data;
  const runId   = generateRunId();
  const batchId = generateBatchId();
  const now     = new Date().toISOString();
  const errors: string[] = [];

  // ── Step 1: Apify harvest ───────────────────────────────────────────────────
  const { posts, actorRunId, error: apifyError } = await runApifyHashtagHarvest(hashtags, maxPerHashtag);

  // Fatal early exit: if Apify couldn't run at all (no token, actor start failure)
  // and returned zero posts, there's nothing to pipeline — surface the error on
  // the form (ok: false) rather than showing an empty results screen.
  if (apifyError && posts.length === 0) {
    return err(apifyError, undefined, 400);
  }

  if (apifyError) {
    errors.push(apifyError);
  }

  // ── Step 2: Extract creator seeds per-hashtag ───────────────────────────────
  // Group posts by source hashtag (best-effort based on post hashtags field)
  const allSeeds = [];
  for (const hashtag of hashtags) {
    const hashtagPosts = posts.filter((p) => {
      const tags = (p.hashtags ?? []).map((h: string) => h.toLowerCase().replace(/^#/, ""));
      return tags.includes(hashtag.toLowerCase());
    });

    // Fallback: if no posts match the filter (actor may not return hashtags field),
    // distribute posts across hashtags evenly
    const postsForTag = hashtagPosts.length > 0
      ? hashtagPosts
      : posts.slice(
          hashtags.indexOf(hashtag) * maxPerHashtag,
          (hashtags.indexOf(hashtag) + 1) * maxPerHashtag
        );

    allSeeds.push(...extractPostCreators(postsForTag, hashtag, market, category));
  }

  // ── Step 3: Normalize / dedupe across all hashtags ──────────────────────────
  const normalizedCreators = normalizeCreators(allSeeds);

  // ── Step 4: Run resolver + upsert prospects ─────────────────────────────────
  let results: ResolverPipelineResult[] = [];
  if (normalizedCreators.length > 0) {
    try {
      results = await runResolverForSeeds(normalizedCreators, mode, batchId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Resolver error: ${msg}`);
      console.error("[hashtag-harvest/run] resolver error:", msg);
    }
  }

  // ── Step 5: Compute summary metrics ────────────────────────────────────────
  const resolved    = results.filter((r) => r.resolved);
  const withProspect = results.filter((r) => r.prospectId);

  // We can't distinguish new vs updated from upsert currently — mark all as created
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
    totalProspectsCreated: withProspect.length,
    totalProspectsUpdated: 0,
    errors,
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
    { ok: true, run, creators: normalizedCreators, results } satisfies HarvestRunResponse,
    { status: 200 }
  );
}
