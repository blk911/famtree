import { validateSolaLocationSlug } from "../lib/operators/sources/sola/discover-sola-slugs";

const candidates = [
  "lafayette",
  "boulder",
  "centennial",
  "littleton",
  "cherry-creek-clayton-lane",
  "arvada",
  "westminster",
  "westminster-city-center",
  "belmar",
  "denver-west",
  "highlands-ranch-town-center",
  "aurora",
  "southlands",
  "parker",
  "north-academy-blvd",
  "front-range-village",
  "downtown-loveland",
  "denver",
  "dtc",
  "lone-tree",
  "lakewood",
  "broomfield",
  "fort-collins",
  "colorado-springs",
  "geneva-commons",
  "orchard-town-center",
];

async function main() {
  let okCount = 0;
  for (const slug of candidates) {
    const ok = await validateSolaLocationSlug(slug);
    if (ok) okCount++;
    console.log(ok ? "OK" : "NO", slug);
  }
  console.log(`\n${okCount}/${candidates.length} valid`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
