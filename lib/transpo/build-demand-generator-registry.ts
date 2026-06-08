// lib/transpo/build-demand-generator-registry.ts

import { mkdir, readFile, writeFile } from "fs/promises";
import {
  DEMAND_GENERATORS_ARTIFACT_PATH,
  DEMAND_GENERATORS_SEED_PATH,
  TRANSPO_DATA_DIR,
} from "./paths";
import { normalizeDemandGenerator } from "./normalize-demand-generator";
import type { DemandGeneratorsArtifact, DemandGeneratorsSeedFile } from "./types";

export async function buildDemandGeneratorRegistry(): Promise<DemandGeneratorsArtifact> {
  const raw = await readFile(DEMAND_GENERATORS_SEED_PATH, "utf8");
  const seed = JSON.parse(raw) as DemandGeneratorsSeedFile;

  const byKey = new Map<string, ReturnType<typeof normalizeDemandGenerator>>();

  for (const record of seed.records ?? []) {
    const normalized = normalizeDemandGenerator(record);
    byKey.set(normalized.generatorKey, normalized);
  }

  const generators = Array.from(byKey.values()).sort((a, b) => {
    if (a.state !== b.state) return a.state.localeCompare(b.state);
    if (a.county !== b.county) return a.county.localeCompare(b.county);
    return a.displayName.localeCompare(b.displayName);
  });

  const sourceCounts: Record<string, number> = {};
  for (const g of generators) {
    sourceCounts[g.sourceProvider] = (sourceCounts[g.sourceProvider] ?? 0) + 1;
  }

  const artifact: DemandGeneratorsArtifact = {
    generatedAt: new Date().toISOString(),
    total: generators.length,
    sources: Object.fromEntries(
      Object.entries(sourceCounts).map(([key, count]) => [key, { count }]),
    ),
    generators,
  };

  await mkdir(TRANSPO_DATA_DIR, { recursive: true });
  await writeFile(
    DEMAND_GENERATORS_ARTIFACT_PATH,
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8",
  );

  return artifact;
}
