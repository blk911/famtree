// scripts/run-sola-harvest.ts

import { runSolaHarvest } from "@/lib/operators/sources/sola/run-sola-harvest";

async function main() {
  const slugs = process.argv.slice(2).map((slug) => slug.trim()).filter(Boolean);

  if (slugs.length === 0) {
    console.error("Usage: npm run harvest:sola -- <slug> [slug...]");
    console.error("Example: npm run harvest:sola -- lafayette denver-cherry-creek");
    process.exit(1);
  }

  await runSolaHarvest(slugs);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
