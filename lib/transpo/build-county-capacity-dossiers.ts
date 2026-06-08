// lib/transpo/build-county-capacity-dossiers.ts

import { mkdir, readFile, writeFile } from "fs/promises";
import { makeCountyKey } from "./normalize-demand-generator";
import {
  calculateCountyCapacityScore,
  classifyProviderFootprint,
} from "./normalize-provider-capacity";
import {
  COUNTY_CAPACITY_ARTIFACT_PATH,
  PROVIDER_CAPACITY_ARTIFACT_PATH,
  TRANSPO_DATA_DIR,
} from "./paths";
import type { CountyCapacity, CountyCapacityArtifact, ProviderCapacityArtifact } from "./provider-types";

export function buildCountyCapacityFromProviders(
  providers: ProviderCapacityArtifact["providers"],
  state = "CO",
  generatedAt = new Date().toISOString(),
): CountyCapacity[] {
  const byCounty = new Map<string, Set<string>>();

  for (const provider of providers) {
    for (const county of provider.countiesServed) {
      const countyKey = makeCountyKey(state, county);
      const names = byCounty.get(countyKey) ?? new Set<string>();
      names.add(provider.providerName);
      byCounty.set(countyKey, names);
    }
  }

  const counties: CountyCapacity[] = [];

  for (const [countyKey, providerNames] of Array.from(byCounty.entries())) {
    const [, ...countyParts] = countyKey.split(":");
    const county = countyParts.join(":");
    const names = Array.from(providerNames).sort((a, b) => a.localeCompare(b));
    const providerCount = names.length;

    let regionalProviders = 0;
    let statewideProviders = 0;

    for (const provider of providers) {
      if (!provider.countiesServed.includes(county)) continue;
      const footprint = classifyProviderFootprint(provider.countyCount);
      if (footprint === "regional") regionalProviders += 1;
      if (footprint === "statewide") statewideProviders += 1;
    }

    counties.push({
      countyKey,
      county,
      state,
      providerCount,
      activeProviders: providerCount,
      regionalProviders,
      statewideProviders,
      providers: names,
      capacityScore: calculateCountyCapacityScore(providerCount),
      generatedAt,
    });
  }

  return counties.sort((a, b) => {
    if (a.state !== b.state) return a.state.localeCompare(b.state);
    return a.county.localeCompare(b.county);
  });
}

export async function buildCountyCapacityDossiers(
  registryPath: string = PROVIDER_CAPACITY_ARTIFACT_PATH,
): Promise<CountyCapacityArtifact> {
  const raw = await readFile(registryPath, "utf8");
  const registry = JSON.parse(raw) as ProviderCapacityArtifact;
  const generatedAt = new Date().toISOString();
  const counties = buildCountyCapacityFromProviders(registry.providers, "CO", generatedAt);

  const artifact: CountyCapacityArtifact = {
    generatedAt,
    totalCounties: counties.length,
    counties,
  };

  await mkdir(TRANSPO_DATA_DIR, { recursive: true });
  await writeFile(COUNTY_CAPACITY_ARTIFACT_PATH, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

  return artifact;
}
