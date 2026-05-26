// scripts/validate-identity-assembler.ts
// Validates the Identity Seed Assembler pipeline end-to-end.
// Run with: npx tsx scripts/validate-identity-assembler.ts
//
// Tests:
//   1. generateIdentityCandidates returns expected handles
//   2. parsedSeedToIdentitySeed builds correct IdentitySeeds
//   3. parseEducationSeedText handles all input formats
//   4. runIdentityAssembler (dryRun=true) runs without throwing
//   5. savedCount > 0 in dryRun mode (simulated)

import { generateIdentityCandidates } from "../lib/studios/identity-seeds/normalize";
import { parseEducationSeedText, parsedSeedToIdentitySeed } from "../lib/studios/education-seeds/parse";
import { runIdentityAssembler } from "../lib/studios/identity-seeds/assembler";
import type { IdentitySeed } from "../lib/studios/identity-seeds/types";

// ─── ANSI helpers ─────────────────────────────────────────────────────────────

const GREEN  = "\x1b[32m";
const RED    = "\x1b[31m";
const YELLOW = "\x1b[33m";
const RESET  = "\x1b[0m";
const BOLD   = "\x1b[1m";

let passed = 0;
let failed = 0;

function pass(label: string) {
  console.log(`  ${GREEN}✓${RESET} ${label}`);
  passed++;
}

function fail(label: string, detail?: string) {
  console.log(`  ${RED}✗${RESET} ${BOLD}${label}${RESET}`);
  if (detail) console.log(`    ${RED}→ ${detail}${RESET}`);
  failed++;
}

function section(title: string) {
  console.log(`\n${BOLD}${YELLOW}${title}${RESET}`);
}

// ─── Test 1: generateIdentityCandidates ──────────────────────────────────────

section("Test 1 — generateIdentityCandidates");

{
  const seed: IdentitySeed = {
    name: "Jane Smith",
    vertical: "education",
    sourcePlatform: "instagram",
    sourceTool: "education_seed_import",
    seedDate: "2026-05-26",
    batchId: "test-batch",
    runId: null,
  };

  const candidates = generateIdentityCandidates(seed, 10);
  console.log(`    candidates: ${candidates.join(", ")}`);

  if (candidates.length >= 4) pass("returns ≥4 candidates for 'Jane Smith'");
  else fail("returns ≥4 candidates for 'Jane Smith'", `got ${candidates.length}`);

  if (candidates.includes("janesmith")) pass("includes 'janesmith'");
  else fail("includes 'janesmith'", `got [${candidates.join(", ")}]`);

  if (candidates.includes("jane.smith") || candidates.includes("jane_smith")) {
    pass("includes 'jane.smith' or 'jane_smith'");
  } else {
    fail("includes 'jane.smith' or 'jane_smith'", `got [${candidates.join(", ")}]`);
  }
}

// With known handle
{
  const seed: IdentitySeed = {
    name: "Rebecca Torres",
    handle: "@rebeccateaches",
    city: "Denver",
    state: "CO",
    vertical: "education",
    sourcePlatform: "instagram",
    sourceTool: "education_seed_import",
    seedDate: "2026-05-26",
    batchId: "test-batch",
    runId: null,
  };

  const candidates = generateIdentityCandidates(seed, 10);
  if (candidates[0] === "rebeccateaches") pass("known handle is candidate #1");
  else fail("known handle is candidate #1", `got #1: ${candidates[0]}`);

  // Check city suffix included
  if (candidates.some((c) => c.includes("den") || c.includes("dnvr") || c.includes("rebeccatorres"))) {
    pass("city suffix or personal name included in candidates");
  } else {
    fail("city suffix or personal name included", `got [${candidates.join(", ")}]`);
  }
}

// Beauty seed (vertical-specific)
{
  const seed: IdentitySeed = {
    name: "Janelle Carter Beauty",
    city: "Houston",
    vertical: "beauty",
    sourcePlatform: "styleseat",
    sourceTool: "styleseat_harvest",
    seedDate: "2026-05-26",
    batchId: "test-batch",
    runId: null,
  };

  const candidates = generateIdentityCandidates(seed, 10);
  if (candidates.includes("janellecarter") || candidates.includes("janellecarterbeauty")) {
    pass("beauty seed: personal name or name+specialty included");
  } else {
    fail("beauty seed: personal name included", `got [${candidates.join(", ")}]`);
  }

  if (candidates.some((c) => c.includes("htx"))) {
    pass("beauty seed: Houston abbreviation 'htx' included");
  } else {
    fail("beauty seed: Houston abbreviation 'htx' included", `got [${candidates.join(", ")}]`);
  }
}

// ─── Test 2: parseEducationSeedText ──────────────────────────────────────────

section("Test 2 — parseEducationSeedText");

{
  const text = `
# Comment line — should be skipped

@homeschoolwithjane
https://instagram.com/mathwithjamie
Jane Smith, Denver, CO, homeschool
Sarah Chen | @sarahlearnsCO | Boulder | CO | microschool
Rebecca Torres
  `.trim();

  const parsed = parseEducationSeedText(text);
  console.log(`    parsed ${parsed.length} seeds`);

  if (parsed.length === 5) pass("parses 5 active lines (skips blank + comment)");
  else fail("parses 5 active lines", `got ${parsed.length}`);

  const handle = parsed.find((p) => p.format === "handle");
  if (handle && handle.handle === "homeschoolwithjane") pass("handle format: @homeschoolwithjane");
  else fail("handle format: @homeschoolwithjane");

  const url = parsed.find((p) => p.format === "url");
  if (url && url.handle === "mathwithjamie") pass("URL format: extracts 'mathwithjamie'");
  else fail("URL format: extracts 'mathwithjamie'", `got ${url?.handle}`);

  const csv = parsed.find((p) => p.format === "csv");
  if (csv && csv.name === "Jane Smith" && csv.city === "Denver" && csv.state === "CO") {
    pass("CSV format: name, city, state parsed correctly");
  } else {
    fail("CSV format: name, city, state", `name=${csv?.name}, city=${csv?.city}, state=${csv?.state}`);
  }
  if (csv && csv.educationType === "homeschool") {
    pass("CSV format: educationType inferred as 'homeschool'");
  } else {
    fail("CSV format: educationType inferred as 'homeschool'", `got ${csv?.educationType}`);
  }

  const pipe = parsed.find((p) => p.format === "pipe");
  if (pipe && pipe.name === "Sarah Chen" && pipe.handle === "sarahlearnsco") {
    pass("pipe format: name and handle extracted");
  } else {
    fail("pipe format: name and handle", `name=${pipe?.name}, handle=${pipe?.handle}`);
  }
  if (pipe && pipe.educationType === "microschool") {
    pass("pipe format: educationType inferred as 'microschool'");
  } else {
    fail("pipe format: educationType inferred as 'microschool'", `got ${pipe?.educationType}`);
  }

  const nameOnly = parsed.find((p) => p.format === "name_only" && p.name === "Rebecca Torres");
  if (nameOnly) pass("name_only format: 'Rebecca Torres' parsed");
  else fail("name_only format: 'Rebecca Torres'");
}

// ─── Test 3: parsedSeedToIdentitySeed ────────────────────────────────────────

section("Test 3 — parsedSeedToIdentitySeed");

{
  const parsed = parseEducationSeedText("Jane Smith, Denver, CO, tutor")[0];
  const seed = parsedSeedToIdentitySeed(parsed, {
    batchId: "test-batch-001",
    runId:   "test-run-001",
    seedDate: "2026-05-26",
  });

  if (seed.name === "Jane Smith") pass("seed.name correct");
  else fail("seed.name correct", `got ${seed.name}`);

  if (seed.vertical === "education") pass("seed.vertical is 'education'");
  else fail("seed.vertical is 'education'", `got ${seed.vertical}`);

  if (seed.sourceTool === "education_seed_import") pass("seed.sourceTool is 'education_seed_import'");
  else fail("seed.sourceTool is 'education_seed_import'", `got ${seed.sourceTool}`);

  if (seed.educationType === "tutor") pass("seed.educationType is 'tutor'");
  else fail("seed.educationType is 'tutor'", `got ${seed.educationType}`);

  if (seed.city === "Denver" && seed.state === "CO") pass("seed city/state correct");
  else fail("seed city/state", `city=${seed.city}, state=${seed.state}`);
}

// ─── Test 4: runIdentityAssembler (dry run, mock seeds) ──────────────────────

section("Test 4 — runIdentityAssembler (dryRun=true, mock seeds)");

const mockSeeds: IdentitySeed[] = [
  {
    name: "Jane Smith",
    handle: "@janesmith_edu",
    city: "Denver",
    state: "CO",
    vertical: "education",
    category: "homeschool",
    sourcePlatform: "instagram",
    sourceTool: "education_seed_import",
    seedDate: "2026-05-26",
    batchId: "test-batch-mock",
    runId: "test-run-mock",
    educationType: "homeschool",
    audienceType: "parent",
  },
  {
    name: "Sarah Chen",
    city: "Austin",
    state: "TX",
    vertical: "education",
    category: "microschool",
    sourcePlatform: "instagram",
    sourceTool: "education_seed_import",
    seedDate: "2026-05-26",
    batchId: "test-batch-mock",
    runId: "test-run-mock",
    educationType: "microschool",
    audienceType: "parent",
  },
  {
    name: "Rebecca Torres",
    city: "Houston",
    state: "TX",
    vertical: "education",
    category: "tutor",
    sourcePlatform: "instagram",
    sourceTool: "education_seed_import",
    seedDate: "2026-05-26",
    batchId: "test-batch-mock",
    runId: "test-run-mock",
    educationType: "tutor",
    audienceType: "educator",
  },
];

async function runTests() {
  try {
    const result = await runIdentityAssembler(mockSeeds, {
      mode: "fast",
      maxCandidatesPerSeed: 4,
      maxSeeds: 10,
      dryRun: true,
    });

    console.log(`    totalAttempted: ${result.totalAttempted}`);
    console.log(`    savedCount (dryRun): ${result.savedCount}`);
    console.log(`    savedHandles: ${result.savedHandles.join(", ")}`);

    if (result.totalAttempted === 3) pass("totalAttempted === 3");
    else fail("totalAttempted === 3", `got ${result.totalAttempted}`);

    if (result.savedCount === 3) pass("savedCount === 3 in dryRun mode");
    else fail("savedCount === 3 in dryRun mode", `got ${result.savedCount}`);

    if (result.results.length === 3) pass("results.length === 3");
    else fail("results.length === 3", `got ${result.results.length}`);

    // Known handle → candidate #1 → should resolve immediately
    const janeResult = result.results[0];
    if (janeResult.saved) pass("Jane Smith (known handle) saved");
    else fail("Jane Smith (known handle) saved", `saved=${janeResult.saved}`);

    // All results have a dry-run prospectId
    const allHaveId = result.results.every((r) => r.prospectId !== null);
    if (allHaveId) pass("all results have a prospectId in dryRun");
    else fail("all results have a prospectId in dryRun", `failed ids: ${result.results.filter((r) => !r.prospectId).map((r) => r.seed.name)}`);

  } catch (e) {
    fail("runIdentityAssembler did not throw", e instanceof Error ? e.message : String(e));
  }

  // ─── Summary ──────────────────────────────────────────────────────────────────

  console.log(`\n${BOLD}${"─".repeat(50)}${RESET}`);
  console.log(`${BOLD}Results: ${GREEN}${passed} passed${RESET}, ${failed > 0 ? RED : ""}${failed} failed${RESET}`);
  console.log(`${"─".repeat(50)}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error(`${RED}Unhandled error:${RESET}`, e);
  process.exit(1);
});
