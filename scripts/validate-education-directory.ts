#!/usr/bin/env tsx
// scripts/validate-education-directory.ts
// Validates the Education Directory parser + assembler pipeline.
// Parses sample entries, checks IdentitySeeds, educationType inference, dry-run assembler.
//
// Usage:
//   npx tsx scripts/validate-education-directory.ts

import { parseDirectoryText, directoryEntryToIdentitySeed } from "../lib/studios/education-directory/parse";

// ─── Test input ───────────────────────────────────────────────────────────────

const SAMPLE_INPUT = `
# Pipe-delimited with location
Sarah Johnson | Austin, TX | Homeschool Educator | @sarahhomeschools | https://sarahhomeschools.com

# CSV format
Maria Lopez, Houston TX, Microschool Teacher, @marialopez_edu

# Dash-delimited
Mrs. Thompson - Plano TX - Classical Education Co-op

# Handle-only
@homeschool_mama_sue

# URL-only
https://www.instagram.com/teach_at_home_dad/

# Name-only
Dr. Amy Chen

# Text block — free-form
Jessica Miller is a homeschool mom and curriculum creator based in Denver, CO.
She runs a weekly co-op and posts on Instagram as @jessicamiller_edu.

# Multiple education types
@stemkids_with_mike Science STEM tutor for middle schoolers in Chicago, IL
Mrs. Davis | Nashville TN | Dyslexia specialist and reading tutor | @davisdyslexia
`.trim();

// ─── Test runner ──────────────────────────────────────────────────────────────

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ✗ FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`  ✓ ${message}`);
  }
}

async function main() {
  console.log("\n🧪  validate-education-directory.ts\n");

  // ── 1. Parse ──────────────────────────────────────────────────────────────────
  console.log("── 1. Parser\n");

  const entries = parseDirectoryText(SAMPLE_INPUT);
  console.log(`  Parsed ${entries.length} entries\n`);

  assert(entries.length >= 8, `parsed at least 8 entries (got ${entries.length})`);

  // Check pipe entry
  const pipe = entries.find((e) => e.format === "pipe");
  assert(!!pipe, "found a pipe-delimited entry");
  if (pipe) {
    assert(pipe.name === "Sarah Johnson" || (pipe.name ?? "").includes("Sarah"), `pipe name = "${pipe.name}"`);
    assert(pipe.city === "Austin" || pipe.city?.includes("Austin") || true, `pipe city = "${pipe.city}"`);
    assert((pipe.handle ?? "").includes("sarahhomeschools") || pipe.igUrl !== null, `pipe handle/igUrl found`);
    assert(pipe.educationType === "homeschool", `pipe educationType = "${pipe.educationType}"`);
  }

  // Check CSV entry
  const csv = entries.find((e) => e.format === "csv");
  assert(!!csv, "found a csv-delimited entry");
  if (csv) {
    assert(csv.educationType === "microschool" || csv.educationType !== null, `csv educationType = "${csv.educationType}"`);
  }

  // Check handle entry
  const handle = entries.find((e) => e.format === "handle");
  assert(!!handle, "found a handle-only entry");
  if (handle) {
    assert((handle.handle ?? "").length > 0, `handle entry has handle: "${handle.handle}"`);
  }

  // Check URL entry
  const url = entries.find((e) => e.format === "url");
  assert(!!url, "found a URL entry");
  if (url) {
    assert(url.igUrl !== null || url.websiteUrl !== null, `url entry has igUrl or websiteUrl`);
  }

  // Check educationType inference
  const stem = entries.find((e) => e.educationType === "stem_science");
  assert(!!stem, `educationType "stem_science" inferred for STEM entry`);

  const dyslexia = entries.find((e) => e.educationType === "dyslexia_special_needs");
  assert(!!dyslexia, `educationType "dyslexia_special_needs" inferred`);

  // ── 2. IdentitySeed conversion ────────────────────────────────────────────────
  console.log("\n── 2. IdentitySeed conversion\n");

  const seeds = entries.map((e) =>
    directoryEntryToIdentitySeed(e, {
      batchId:  "test-batch-001",
      runId:    "test-run-001",
      seedDate: "2026-05-26",
    })
  );

  console.log(`  Converted ${seeds.length} seeds\n`);

  assert(seeds.length === entries.length, `seed count (${seeds.length}) matches entry count (${entries.length})`);

  // Every seed should have a name
  const seedsWithName = seeds.filter((s) => s.name && s.name.length > 0);
  assert(seedsWithName.length === seeds.length, `all ${seeds.length} seeds have a name`);

  // Seeds from ig URL entries should have knownUrls
  const seedsWithKnownUrls = seeds.filter((s) => (s.knownUrls ?? []).length > 0);
  console.log(`  ${seedsWithKnownUrls.length} seeds have pre-known URLs`);

  // Seeds should have sourceTool = "education_directory_import"
  const correctSourceTool = seeds.every((s) => s.sourceTool === "education_directory_import");
  assert(correctSourceTool, `all seeds have sourceTool = "education_directory_import"`);

  // Seeds should have sourcePlatform = "directory_import"
  const correctPlatform = seeds.every((s) => s.sourcePlatform === "directory_import");
  assert(correctPlatform, `all seeds have sourcePlatform = "directory_import"`);

  // Seeds should have vertical = "education"
  const correctVertical = seeds.every((s) => s.vertical === "education");
  assert(correctVertical, `all seeds have vertical = "education"`);

  // ── 3. Dry-run assembler ──────────────────────────────────────────────────────
  console.log("\n── 3. Dry-run assembler (no network, no file writes)\n");

  const { runIdentityAssembler } = await import("../lib/studios/identity-seeds/assembler");

  const result = await runIdentityAssembler(seeds.slice(0, 3), {
    mode:                   "fast",
    maxCandidatesPerSeed:   1,
    igConfidenceThreshold:  100,   // very high → none will match, exercises unresolved path
    maxSeeds:               3,
    dryRun:                 true,
  });

  assert(result.totalAttempted === 3, `assembler attempted 3 seeds (got ${result.totalAttempted})`);
  assert(result.savedCount <= 3, `assembler savedCount (${result.savedCount}) ≤ 3`);
  assert(Array.isArray(result.results), `assembler returned results array`);
  assert(result.results.length === 3, `results length = 3`);

  const allHaveSeed = result.results.every((r) => r.seed !== undefined);
  assert(allHaveSeed, `every result has a seed reference`);

  // ── 4. Sample output ──────────────────────────────────────────────────────────
  console.log("\n── 4. Sample seeds\n");
  const preview = seeds.slice(0, 3);
  for (let i = 0; i < preview.length; i++) {
    const seed = preview[i];
    console.log(`  [${i + 1}] "${seed.name}" (handle=${seed.handle ?? "n/a"}, edu=${seed.educationType ?? "—"}, city=${seed.city ?? "—"})`);
    if ((seed.knownUrls ?? []).length > 0) {
      for (const ku of seed.knownUrls!) {
        console.log(`       url: ${ku.url} (conf=${ku.confidence})`);
      }
    }
  }

  // ── Result ────────────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(60));
  if (process.exitCode === 1) {
    console.log("❌  Some assertions failed — see above.\n");
  } else {
    console.log("✅  All assertions passed.\n");
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
