// lib/studios/styleseat/resolver.ts
// Adapts StyleSeat operators into IdentitySeeds and delegates to the shared
// Identity Seed Assembler pipeline.
//
// StyleSeat is an intake adapter — no forked resolver logic, no separate
// prospect truth. All resolution + upsert goes through runIdentityAssembler().

import { runIdentityAssembler } from "@/lib/studios/identity-seeds/assembler";
import { operatorToIdentitySeed } from "./normalize";
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

// ─── Main entry ───────────────────────────────────────────────────────────────

export async function runStyleSeatPipeline(
  operators: StyleSeatOperator[],
  mode: ResolveMode,
  ctx: StyleSeatHarvestContext,
): Promise<StyleSeatPipelineResult> {
  const capped = operators.slice(0, MAX_RESOLVE);

  console.log(`[styleseat/resolver] converting ${capped.length} operators → IdentitySeeds`);

  // Convert operators → IdentitySeeds
  const seeds = capped.map((op) => operatorToIdentitySeed(op, ctx));

  // Delegate to shared assembler
  const assemblerResult = await runIdentityAssembler(seeds, {
    mode,
    maxCandidatesPerSeed: 8,
    maxSeeds: MAX_RESOLVE,
    igConfidenceThreshold: 20,
    sourcePathOverrides: {
      verticalLabel: "Beauty",
      platformLabel: "StyleSeat",
      toolLabel:     "StyleSeat Harvest",
    },
  });

  // Adapt assembler results → StyleSeatResolverResult[]
  const results: StyleSeatResolverResult[] = assemblerResult.results.map((r, i) => {
    const operator = capped[i];
    const igConf   = r.igConfidence;

    const status: StyleSeatOperatorStatus =
      r.prospectId && r.igHandleFound && igConf >= 55 ? "ig_verified"     :
      r.igHandleFound && igConf >= 20                 ? "ig_candidate"    :
      r.prospectId                                    ? "resolver_merged" :
      "unresolved";

    return {
      operator,
      igHandleFound:      r.igHandleFound,
      igCandidatesTried:  r.igCandidatesTried,
      resolved:           r.resolved,
      bestMatchUrl:       r.seed.knownUrls?.[0]?.url ?? null,
      bestMatchPlatform:  r.seed.knownUrls?.[0]?.platform ?? null,
      igConfidence:       igConf,
      prospectId:         r.prospectId,
      status,
      notes: r.igHandleFound
        ? `IG candidate found (conf=${igConf})`
        : "No IG handle identified",
      saveError: r.saveError,
    };
  });

  // Adapt saveErrors to StyleSeat's SaveError shape
  const saveErrors: SaveError[] = assemblerResult.saveErrors.map((e, i) => ({
    handle:       e.handle,
    sourceHashtag: capped[i]?.categories[0] ?? "beauty",
    platform:     null,
    message:      e.message,
  }));

  return {
    results,
    savedCount:       assemblerResult.savedCount,
    failedToSaveCount: assemblerResult.failedToSaveCount,
    saveErrors,
    totalIgFound:     assemblerResult.totalIgFound,
    savedHandles:     assemblerResult.savedHandles,
  };
}
