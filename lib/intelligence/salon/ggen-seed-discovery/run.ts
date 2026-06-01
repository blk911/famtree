// lib/intelligence/salon/ggen-seed-discovery/run.ts

import { parseGgenSeedText } from "./parse";
import { discoverGgenForSeed } from "./discover";
import { saveGgenDiscoveryRun } from "./store";
import type { GgenDiscoveryRun, GgenSeedDiscoveryResult } from "./types";

export type RunGgenDiscoveryOptions = {
  inputText: string;
  category?: string;
  city?: string;
  state?: string;
  maxSeeds?: number;
  enableSearch?: boolean;
  matchProspects?: boolean;
};

function generateRunId(): string {
  return `ggen-run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function runGgenSeedDiscovery(
  options: RunGgenDiscoveryOptions,
): Promise<{ run: GgenDiscoveryRun; storePath: string }> {
  const runId = generateRunId();
  const seeds = parseGgenSeedText(options.inputText, {
    category: options.category,
    city: options.city,
    state: options.state,
  });

  const max = options.maxSeeds ?? 100;
  const batch = seeds.slice(0, max);
  const results: GgenSeedDiscoveryResult[] = [];

  for (let i = 0; i < batch.length; i++) {
    const seed = batch[i]!;
    const result = await discoverGgenForSeed(seed, runId, i, {
      enableSearch: options.enableSearch ?? true,
      matchProspects: options.matchProspects ?? true,
    });
    results.push(result);
  }

  const foundCount = results.filter((r) => r.found).length;
  const importCandidateCount = results.filter((r) => r.importCandidate).length;

  const run: GgenDiscoveryRun = {
    runId,
    createdAt: new Date().toISOString(),
    marketCity: options.city ?? null,
    marketState: options.state ?? null,
    defaultCategory: options.category ?? null,
    seedCount: results.length,
    foundCount,
    importCandidateCount,
    results,
  };

  const storePath = await saveGgenDiscoveryRun(run);
  return { run, storePath };
}
