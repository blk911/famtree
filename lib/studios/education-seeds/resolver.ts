// lib/studios/education-seeds/resolver.ts
// Thin wrapper: parses education seed text → IdentitySeeds → runIdentityAssembler().
// No forked resolver logic. All resolution goes through the shared assembler.

import { runIdentityAssembler } from "@/lib/studios/identity-seeds/assembler";
import { parseEducationSeedText, parsedSeedToIdentitySeed } from "./parse";
import type { IdentityAssemblerRunResult } from "@/lib/studios/identity-seeds/types";
import type { EducationSeedRunConfig } from "./types";

export interface EducationSeedPipelineResult {
  runId: string;
  parsedCount: number;
  assemblerResult: IdentityAssemblerRunResult;
}

export async function runEducationSeedPipeline(
  config: EducationSeedRunConfig,
  runId: string,
): Promise<EducationSeedPipelineResult> {
  const batchId   = `edu-batch-${runId}`;
  const seedDate  = new Date().toISOString().slice(0, 10);

  // Parse textarea → ParsedEducationSeed[]
  const parsed = parseEducationSeedText(config.inputText);

  console.log(`[education-seeds/resolver] parsed ${parsed.length} seeds from input`);

  // Convert → IdentitySeed[]
  const seeds = parsed.map((p) =>
    parsedSeedToIdentitySeed(p, {
      batchId,
      runId,
      seedDate,
      defaultEducationType: config.defaultEducationType ?? null,
      defaultAudienceType:  config.defaultAudienceType  ?? null,
    })
  );

  // Delegate to shared assembler
  const assemblerResult = await runIdentityAssembler(seeds, {
    mode:                 config.mode,
    maxCandidatesPerSeed: config.maxCandidatesPerSeed ?? 8,
    maxSeeds:             50,
    igConfidenceThreshold: 20,
    dryRun:               config.dryRun ?? false,
    sourcePathOverrides: {
      verticalLabel: "Education",
      platformLabel: "Instagram",
      toolLabel:     "Education Seed Import",
    },
  });

  return {
    runId,
    parsedCount: parsed.length,
    assemblerResult,
  };
}
