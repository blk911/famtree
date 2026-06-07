// scripts/discover-sola-slugs.ts

import {
  collectDiscoveryInputs,
  discoverSolaSlugs,
} from "@/lib/operators/sources/sola/discover-sola-slugs";

async function main() {
  const inputs = await collectDiscoveryInputs(process.argv.slice(2));

  if (inputs.length === 0) {
    console.error("Usage: npm run discover:sola -- <slug|url> [more...] [path/to/slugs.txt]");
    console.error("Example: npm run discover:sola -- lafayette");
    console.error(
      "Example: npm run discover:sola -- https://book.solasalonstudios.com/lafayette/location",
    );
    process.exit(1);
  }

  const summary = await discoverSolaSlugs(inputs);

  console.log(`inputCount=${summary.inputCount}`);
  console.log(`validAdded=${summary.validAdded}`);
  console.log(`alreadyExisted=${summary.alreadyExisted}`);
  console.log(`invalidSkipped=${summary.invalidSkipped}`);
  console.log(`validSlugCount=${summary.slugs.length}`);
  console.log(JSON.stringify(summary.slugs, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
