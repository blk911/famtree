#!/usr/bin/env tsx
// scripts/test-sola-ingest-handoff.ts
// Usage: npm run test:sola-ingest-handoff

import { normalizeSolaSourceUrl } from "@/lib/intelligence/salon/source-ingest/normalize-sola-source-url";
import {
  buildSolaIngestOutcome,
  buildSolaNextLinks,
} from "@/lib/intelligence/salon/source-ingest/sola-ingest-handoff";

const PASS = "\x1b[32mPASS\x1b[0m";
const FAIL = "\x1b[31mFAIL\x1b[0m";

let failures = 0;

function pass(msg: string) {
  console.log(`  ${PASS}  ${msg}`);
}

function fail(msg: string) {
  console.log(`  ${FAIL}  ${msg}`);
  failures++;
}

console.log("Sola ingest handoff\n");

const normalized = normalizeSolaSourceUrl(
  "https://book.solasalonstudios.com/castle-rock/location",
);
if (!normalized.recognized || normalized.normalization.slug !== "castle-rock") {
  fail("castle-rock URL normalization");
} else {
  pass("castle-rock URL normalizes");
}

const links = buildSolaNextLinks("castle-rock", "dir-test123");
if (!links.markets.includes("source=sola") || !links.markets.includes("location=castle-rock")) {
  fail(`nextLinks.markets missing filters: ${links.markets}`);
} else {
  pass("nextLinks.markets includes source and location filters");
}

const complete = buildSolaIngestOutcome({
  slug: "castle-rock",
  runId: "dir-test123",
  harvestSucceeded: true,
  listingsFound: 34,
  profilesEnriched: 12,
  promotion: {
    resolverCandidatesCreated: 34,
    marketCandidatesCreated: 34,
    artifactPaths: { resolverImport: "/tmp/sola/sola-resolver-import.generated.json" },
    errors: [],
    succeeded: true,
  },
});

if (
  !complete.ok ||
  complete.resolverCandidatesCreated !== 34 ||
  complete.marketCandidatesCreated !== 34 ||
  complete.promotionSucceeded !== true
) {
  fail("complete promotion outcome missing counts");
} else {
  pass("complete promotion includes resolverCandidatesCreated and marketCandidatesCreated");
}

const partial = buildSolaIngestOutcome({
  slug: "castle-rock",
  runId: "dir-partial",
  harvestSucceeded: true,
  listingsFound: 34,
  profilesEnriched: 10,
  promotion: {
    resolverCandidatesCreated: 0,
    marketCandidatesCreated: 0,
    artifactPaths: {},
    errors: ["Resolver import failed: EROFS"],
    succeeded: false,
  },
});

if (
  partial.ok ||
  partial.status !== "harvest_only" ||
  !partial.errors.some((e) => e.includes("Harvest succeeded, promotion failed"))
) {
  fail("partial promotion should return harvest_only with promotion error");
} else {
  pass("promotion failure returns partial success with error");
}

console.log("");
if (failures > 0) {
  console.log(`${FAIL}  ${failures} test(s) failed`);
  process.exit(1);
}
console.log(`${PASS}  All handoff tests passed`);
process.exit(0);
