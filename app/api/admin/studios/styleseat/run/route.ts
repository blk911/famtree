// app/api/admin/studios/styleseat/run/route.ts
// POST /api/admin/studios/styleseat/run
// Runs the full StyleSeat discovery → IG enrichment → prospect pipeline.
// Admin-only. Not exposed to members.

export const dynamic     = "force-dynamic";
export const maxDuration = 120; // enrichment phase can take 60-90s

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runStyleSeatHarvest } from "@/lib/studios/styleseat/extract";
import { runStyleSeatPipeline } from "@/lib/studios/styleseat/resolver";
import { saveStyleSeatRun, generateStyleSeatRunId } from "@/lib/studios/styleseat/store";
import { getStoreBackendInfo, countProspects } from "@/lib/studios/prospects/store";
import { generateBatchId } from "@/lib/studios/prospects/from-resolver";
import type { StyleSeatHarvestContext } from "@/lib/studios/styleseat/resolver";
import type {
  StyleSeatHarvestRun,
  StyleSeatRunResponse,
  StyleSeatErrorResponse,
  StyleSeatCategory,
} from "@/lib/studios/styleseat/types";

// ─── Validation schema ────────────────────────────────────────────────────────

const VALID_CATEGORIES: StyleSeatCategory[] = [
  "hair", "braids", "barber", "locs", "makeup",
  "lashes", "brows", "nails", "extensions",
];

const RunSchema = z.object({
  market:     z.string().min(2).max(80),
  state:      z.string().max(40).optional().default(""),
  categories: z.array(z.enum(VALID_CATEGORIES as [StyleSeatCategory, ...StyleSeatCategory[]])).min(1).max(9),
  maxResults: z.number().int().min(1).max(100).default(10),
  mode:       z.enum(["fast", "deep"]).default("fast"),
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

  const { market, state, categories, maxResults, mode } = parsed.data;
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
  console.log(`[styleseat/run] harvesting market=${market} categories=[${categories}] maxResults=${maxResults}`);
  const { operators, actorRunId, error: harvestError } = await runStyleSeatHarvest({
    market, state, categories, maxResults, mode,
  });

  if (harvestError) errors.push(harvestError);
  console.log(`[styleseat/run] harvested ${operators.length} operators`);

  if (operators.length === 0) {
    return err(harvestError ?? "StyleSeat harvest returned 0 operators", undefined, 400);
  }

  // ── Step 3: IG enrichment + prospect upserts ────────────────────────────────
  const harvestCtx: StyleSeatHarvestContext = {
    runId,
    batchId,
    harvestDate:    now.slice(0, 10),
    vertical:       "beauty",
    sourcePlatform: "styleseat",
    sourceTool:     "styleseat_harvest",
    market,
    state,
    categories,
  };

  let pipelineResult = {
    results: [] as Awaited<ReturnType<typeof runStyleSeatPipeline>>["results"],
    savedCount: 0,
    failedToSaveCount: 0,
    saveErrors: [] as Awaited<ReturnType<typeof runStyleSeatPipeline>>["saveErrors"],
    totalIgFound: 0,
    savedHandles: [] as string[],
  };

  try {
    pipelineResult = await runStyleSeatPipeline(operators, mode, harvestCtx);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`Pipeline error: ${msg}`);
    console.error("[styleseat/run] pipeline error:", msg);
  }

  const { results, savedCount, failedToSaveCount, saveErrors, totalIgFound, savedHandles } = pipelineResult;

  // ── Step 4: After-count ─────────────────────────────────────────────────────
  const prospectsAfterCount = await countProspects();
  console.log(`[styleseat/run] prospectsAfter=${prospectsAfterCount} delta=+${prospectsAfterCount - prospectsBeforeCount}`);

  if (failedToSaveCount > 0) {
    errors.push(`${failedToSaveCount} operator(s) failed to save — see saveErrors`);
  }

  // ── Step 5: Build run summary ───────────────────────────────────────────────
  const run: StyleSeatHarvestRun = {
    runId,
    batchId,
    createdAt: now,
    market,
    state,
    categories,
    mode,
    apifyActorRunId: actorRunId,
    totalHarvested:  operators.length,
    totalIgFound,
    totalResolved:   results.filter((r) => r.resolved).length,
    totalProspects:  savedCount,
    savedCount,
    failedToSaveCount,
    saveErrors,
    errors,
    prospectStorePath,
    prospectStoreBackend: backendInfo.backend,
    prospectsBeforeCount,
    prospectsAfterCount,
    savedHandles,
  };

  // ── Step 6: Persist run file ────────────────────────────────────────────────
  try {
    await saveStyleSeatRun({ run, operators, results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[styleseat/run] save run file error:", msg);
    run.errors.push(`Run file not saved: ${msg}`);
  }

  return NextResponse.json(
    { ok: true, run, operators, results } satisfies StyleSeatRunResponse,
    { status: 200 }
  );
}
