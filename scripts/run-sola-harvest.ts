// scripts/run-sola-harvest.ts

import { readSeedSlugs, runSolaHarvest } from "@/lib/operators/sources/sola/run-sola-harvest";
import type { SolaHarvestOptions } from "@/lib/operators/sources/sola/types";

function parseArgs(argv: string[]): {
  slugs: string[];
  options: SolaHarvestOptions;
} {
  const slugs: string[] = [];
  const options: SolaHarvestOptions = {};

  for (const arg of argv) {
    if (arg === "--enrich") {
      options.enrichProfiles = true;
      continue;
    }
    if (arg === "--api-only") {
      options.apiOnly = true;
      options.enrichProfiles = true;
      continue;
    }
    if (arg === "--reuse-artifacts") {
      options.reuseArtifacts = true;
      continue;
    }
    if (arg === "--seed") {
      options.seedBatch = true;
      continue;
    }
    if (arg.startsWith("--limit=")) {
      const value = Number.parseInt(arg.slice("--limit=".length), 10);
      if (Number.isFinite(value) && value > 0) {
        options.profileLimit = value;
      }
      continue;
    }
    if (!arg.startsWith("--")) {
      slugs.push(arg.trim().toLowerCase());
    }
  }

  return { slugs, options };
}

async function main() {
  const { slugs, options } = parseArgs(process.argv.slice(2));
  let slugList = slugs;

  if (options.seedBatch) {
    slugList = await readSeedSlugs();
    console.log(`[sola-harvest] seed batch: ${slugList.length} slug(s) from sola-slugs.seed.json`);
  }

  if (slugList.length === 0) {
    console.error(
      "Usage: npm run harvest:sola -- <slug> [slug...] [--seed] [--enrich] [--api-only] [--reuse-artifacts] [--limit=N]",
    );
    console.error(
      "Example: npm run harvest:sola -- --seed --enrich --api-only --reuse-artifacts",
    );
    process.exit(1);
  }

  const { marketSummary } = await runSolaHarvest(slugList, options);
  console.log(JSON.stringify(marketSummary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
