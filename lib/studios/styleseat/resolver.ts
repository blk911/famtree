// lib/studios/styleseat/resolver.ts
// Orchestrates the full StyleSeat → IG enrichment → upsert pipeline.
//
// Architecture mirrors run-resolver.ts:
//   Phase 1 — IG enrichment runs in PARALLEL (network-bound).
//   Phase 2 — Prospect upserts run SEQUENTIALLY (file I/O, no concurrent writes).

import { upsertProspect } from "@/lib/studios/prospects/store";
import { findIgMatchForOperator } from "./ig-enrichment";
import { operatorToUpsertInput } from "./normalize";
import type { StyleSeatHarvestContext } from "./normalize";
import type {
  StyleSeatOperator,
  StyleSeatResolverResult,
  StyleSeatOperatorStatus,
} from "./types";
import type { ResolveMode } from "@/lib/studios/creator-lab/ig-stubs/types";
import type { SaveError } from "@/lib/studios/creator-lab/hashtag-harvest/types";

export type { StyleSeatHarvestContext };

// Max operators to resolve per run (cost / time guard)
const MAX_RESOLVE = 40;

// ─── Pipeline result ──────────────────────────────────────────────────────────

export interface StyleSeatPipelineResult {
  results: StyleSeatResolverResult[];
  savedCount: number;
  failedToSaveCount: number;
  saveErrors: SaveError[];
  totalIgFound: number;
  savedHandles: string[];
}

// ─── Phase 1 intermediate shape ───────────────────────────────────────────────

interface EnrichedOperator {
  operator: StyleSeatOperator;
  igHandleFound: string | null;
  igCandidatesTried: number;
  igConfidence: number;
  profiles: import("@/lib/studios/creator-lab/ig-stubs/types").ResolvedProfile[];
  upsertInput: import("@/lib/studios/prospects/store").UpsertInput;
}

// ─── Main entry ───────────────────────────────────────────────────────────────

export async function runStyleSeatPipeline(
  operators: StyleSeatOperator[],
  mode: ResolveMode,
  ctx: StyleSeatHarvestContext,
): Promise<StyleSeatPipelineResult> {
  const capped = operators.slice(0, MAX_RESOLVE);

  console.log(`[styleseat/resolver] Phase 1: enriching ${capped.length} operators (mode=${mode})`);

  // ── Phase 1: IG enrichment in PARALLEL ────────────────────────────────────
  const settled = await Promise.allSettled(
    capped.map(async (operator): Promise<EnrichedOperator> => {
      const match = await findIgMatchForOperator(operator, mode);

      const igHandleFound   = match?.handle ?? null;
      const igCandidatesTried = match?.candidatesTried ?? 1;
      const igConfidence    = match?.confidence ?? 0;
      const profiles        = match?.profiles ?? [];

      const upsertInput = operatorToUpsertInput(operator, igHandleFound, profiles, ctx);

      return { operator, igHandleFound, igCandidatesTried, igConfidence, profiles, upsertInput };
    })
  );

  // ── Phase 2: sequential upserts ───────────────────────────────────────────
  const results: StyleSeatResolverResult[] = [];
  const saveErrors: SaveError[] = [];
  const savedHandles: string[] = [];
  let savedCount       = 0;
  let failedToSaveCount = 0;
  let totalIgFound     = 0;

  const upsertAttempts = settled.filter((s) => s.status === "fulfilled").length;
  console.log(`[styleseat/resolver] Phase 2: ${upsertAttempts} upserts (${settled.filter(s => s.status === "rejected").length} phase-1 failures)`);

  for (let i = 0; i < settled.length; i++) {
    const s = settled[i];
    const original = capped[i];

    if (s.status === "rejected") {
      const msg = s.reason instanceof Error ? s.reason.message : "enrichment error";
      results.push({
        operator: original,
        igHandleFound: null,
        igCandidatesTried: 0,
        resolved: false,
        bestMatchUrl: null,
        bestMatchPlatform: null,
        igConfidence: 0,
        prospectId: null,
        status: "unresolved",
        notes: msg,
        saveError: null,
      });
      continue;
    }

    const { operator, igHandleFound, igCandidatesTried, igConfidence, profiles, upsertInput } = s.value;

    if (igHandleFound) totalIgFound++;

    const bestProfile = profiles[0] ?? null;
    const status: StyleSeatOperatorStatus =
      igHandleFound && igConfidence >= 55 ? "ig_verified"  :
      igHandleFound && igConfidence >= 20 ? "ig_candidate" :
      "unresolved";

    let prospectId: string | null = null;
    let saveError:  string | null = null;

    console.log(`[styleseat/resolver] [${i + 1}/${upsertAttempts}] upserting "${operator.name}" (handle=${igHandleFound ?? "none"}, conf=${igConfidence})`);

    try {
      const saved = await upsertProspect(upsertInput);
      prospectId = saved.prospectId;
      savedCount++;
      savedHandles.push(igHandleFound ?? operator.slug);
      console.log(`[styleseat/resolver] ✓ saved "${operator.name}" → ${saved.prospectId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      saveError = msg;
      failedToSaveCount++;
      saveErrors.push({
        handle: igHandleFound ?? operator.slug,
        sourceHashtag: operator.categories[0] ?? "beauty",
        platform: bestProfile?.platform ?? null,
        message: msg,
      });
      console.error(`[styleseat/resolver] ✗ upsert failed for "${operator.name}":`, e);
    }

    results.push({
      operator,
      igHandleFound,
      igCandidatesTried,
      resolved: igHandleFound !== null && igConfidence >= 20,
      bestMatchUrl:      bestProfile?.url ?? null,
      bestMatchPlatform: bestProfile?.platform ?? null,
      igConfidence,
      prospectId,
      status: prospectId ? (status === "unresolved" ? "resolver_merged" : status) : status,
      notes: bestProfile?.matchReason ?? (igHandleFound ? "IG handle found, no booking profile match" : "No IG handle identified"),
      saveError,
    });
  }

  console.log(`[styleseat/resolver] Phase 2 complete: ${savedCount} saved, ${failedToSaveCount} failed, ${totalIgFound} IG matches`);

  return { results, savedCount, failedToSaveCount, saveErrors, totalIgFound, savedHandles };
}
