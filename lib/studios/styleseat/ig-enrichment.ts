// lib/studios/styleseat/ig-enrichment.ts
// Thin StyleSeat adapter for the canonical Identity Seed Assembler.
// Do not add StyleSeat-specific IG resolver logic here.

import { runIdentityAssembler } from "@/lib/studios/identity-seeds/assembler";
import type { IdentityAssemblerRunResult, IdentitySeed } from "@/lib/studios/identity-seeds/types";
import type { ResolveMode } from "@/lib/studios/creator-lab/ig-stubs/types";
import { operatorToIdentitySeed, type StyleSeatHarvestContext } from "./normalize";
import type { StyleSeatOperator } from "./types";

export interface StyleSeatIdentityEnrichmentResult {
  normalized: IdentitySeed[];
  assemblerResult: IdentityAssemblerRunResult;
}

export async function enrichStyleSeatRecordsWithIdentity(
  operators: StyleSeatOperator[],
  mode: ResolveMode,
  ctx: StyleSeatHarvestContext,
  maxSeeds = 40,
): Promise<StyleSeatIdentityEnrichmentResult> {
  const normalized = operators.slice(0, maxSeeds).map((operator) => operatorToIdentitySeed(operator, ctx));
  const assemblerResult = await runIdentityAssembler(normalized, {
    mode,
    maxCandidatesPerSeed: 8,
    maxSeeds,
    igConfidenceThreshold: 20,
    sourcePathOverrides: {
      verticalLabel: "Beauty",
      platformLabel: "StyleSeat",
      toolLabel:     "StyleSeat Harvest",
    },
  });

  return { normalized, assemblerResult };
}
