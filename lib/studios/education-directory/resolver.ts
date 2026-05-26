// lib/studios/education-directory/resolver.ts
// Parses directory text → IdentitySeeds → runIdentityAssembler().
// Thin adapter: no forked resolver logic.

import { runIdentityAssembler } from "@/lib/studios/identity-seeds/assembler";
import { parseDirectoryText, directoryEntryToIdentitySeed } from "./parse";
import type { IdentityAssemblerRunResult } from "@/lib/studios/identity-seeds/types";
import type { ParsedDirectoryEntry } from "./types";

export interface DirectoryPipelineResult {
  runId: string;
  entries: ParsedDirectoryEntry[];
  parsedCount: number;
  assemblerResult: IdentityAssemblerRunResult;
}

export async function runDirectoryPipeline(
  inputText: string,
  runId: string,
  opts: {
    mode: "fast" | "deep";
    maxCandidatesPerSeed?: number;
    dryRun?: boolean;
  },
): Promise<DirectoryPipelineResult> {
  const batchId  = `dir-batch-${runId}`;
  const seedDate = new Date().toISOString().slice(0, 10);

  const entries = parseDirectoryText(inputText);
  console.log(`[education-directory/resolver] parsed ${entries.length} entries`);

  const seeds = entries.map((e) =>
    directoryEntryToIdentitySeed(e, { batchId, runId, seedDate })
  );

  const assemblerResult = await runIdentityAssembler(seeds, {
    mode:                 opts.mode,
    maxCandidatesPerSeed: opts.maxCandidatesPerSeed ?? 8,
    maxSeeds:             60,
    igConfidenceThreshold: 20,
    dryRun:               opts.dryRun ?? false,
    sourcePathOverrides: {
      verticalLabel: "Education",
      platformLabel: "Directory Import",
      toolLabel:     "Education Directory Import",
    },
  });

  return { runId, entries, parsedCount: entries.length, assemblerResult };
}
