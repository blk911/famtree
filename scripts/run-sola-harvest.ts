// scripts/run-sola-harvest.ts

import { runSolaHarvest } from "@/lib/operators/sources/sola/run-sola-harvest";
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

  if (slugs.length === 0) {
    console.error(
      "Usage: npm run harvest:sola -- <slug> [slug...] [--enrich] [--api-only] [--limit=N]",
    );
    console.error("Example: npm run harvest:sola -- lafayette --enrich --api-only");
    process.exit(1);
  }

  await runSolaHarvest(slugs, options);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
