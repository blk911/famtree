#!/usr/bin/env tsx
// scripts/test-sola-source-url-normalizer.ts
// Usage: npm run test:sola-source-url

import { normalizeSolaSourceUrl } from "@/lib/intelligence/salon/source-ingest/normalize-sola-source-url";

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

function expectSlug(input: string, expectedSlug: string) {
  const result = normalizeSolaSourceUrl(input);
  if (!result.recognized) {
    fail(`"${input}" — expected slug "${expectedSlug}", got unrecognized`);
    return;
  }
  const { slug, sourceProvider, directoryUrl } = result.normalization;
  if (sourceProvider !== "sola") {
    fail(`"${input}" — expected sourceProvider "sola", got "${sourceProvider}"`);
    return;
  }
  if (slug !== expectedSlug) {
    fail(`"${input}" — expected slug "${expectedSlug}", got "${slug}"`);
    return;
  }
  if (!directoryUrl.includes(`book.solasalonstudios.com/${expectedSlug}/location`)) {
    fail(`"${input}" — directoryUrl missing book location path: ${directoryUrl}`);
    return;
  }
  if (directoryUrl.includes("?") || directoryUrl.includes("#")) {
    fail(`"${input}" — directoryUrl should not contain query/hash: ${directoryUrl}`);
    return;
  }
  pass(`"${input}" -> ${slug}`);
}

function expectUnrecognized(input: string) {
  const result = normalizeSolaSourceUrl(input);
  if (result.recognized) {
    fail(`"${input}" — expected unrecognized, got slug "${result.normalization.slug}"`);
    return;
  }
  pass(`"${input}" -> unrecognized`);
}

console.log("Sola source URL normalizer\n");

expectSlug(
  "http://book.solasalonstudios.com/castle-rock/location?utm_source=google&utm_medium=cpc",
  "castle-rock",
);
expectSlug("https://book.solasalonstudios.com/castle-rock/location", "castle-rock");
expectSlug("https://www.solasalonstudios.com/locations/castle-rock", "castle-rock");
expectSlug("castle-rock", "castle-rock");

expectUnrecognized("https://book.solasalonstudios.com/castle-rock/pro");
expectUnrecognized("https://www.vagaro.com/professionals/nails/parker--co");

console.log("");
if (failures > 0) {
  console.log(`${FAIL}  ${failures} test(s) failed`);
  process.exit(1);
}
console.log(`${PASS}  All tests passed`);
process.exit(0);
