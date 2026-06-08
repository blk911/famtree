// lib/transpo/build-provider-capacity-registry.ts

import { mkdir, readFile, writeFile } from "fs/promises";
import { aggregateProvidersFromAssignments } from "./normalize-provider-capacity";
import { PROVIDER_CAPACITY_ARTIFACT_PATH, PROVIDER_CAPACITY_SEED_PATH, TRANSPO_DATA_DIR } from "./paths";
import type { ProviderCapacityArtifact, ProviderCapacitySeedFile } from "./provider-types";

export async function buildProviderCapacityRegistry(): Promise<ProviderCapacityArtifact> {
  const raw = await readFile(PROVIDER_CAPACITY_SEED_PATH, "utf8");
  const seed = JSON.parse(raw) as ProviderCapacitySeedFile;

  const providers = aggregateProvidersFromAssignments(seed.records ?? [], {
    sourceProvider: seed.sourceProvider ?? "hcpf_nemt_list",
    sourceUrl: seed.sourceUrl,
  });

  const artifact: ProviderCapacityArtifact = {
    generatedAt: new Date().toISOString(),
    totalProviders: providers.length,
    providers,
  };

  await mkdir(TRANSPO_DATA_DIR, { recursive: true });
  await writeFile(
    PROVIDER_CAPACITY_ARTIFACT_PATH,
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8",
  );

  return artifact;
}
