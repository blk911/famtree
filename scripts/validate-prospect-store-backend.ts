#!/usr/bin/env tsx
// scripts/validate-prospect-store-backend.ts
// Validates the prospect store adapter: prints backend, tests insert/upsert/filter/update/preservation.
// Works with either json or postgres backend. Cleans up test records after each run.
//
// Usage:
//   npx tsx scripts/validate-prospect-store-backend.ts
//   PROSPECT_STORE_BACKEND=postgres npx tsx scripts/validate-prospect-store-backend.ts

import {
  getStoreBackendInfo,
  upsertProspect,
  updateProspect,
  filterProspects,
  countProspects,
} from "../lib/studios/prospects/store";
import type { UpsertInput } from "../lib/studios/prospects/store";

// ─── Test data ────────────────────────────────────────────────────────────────

function makeTestInput(suffix: string): UpsertInput {
  return {
    source: {
      sourceType:         "education_directory_import",
      batchId:            `validate-batch-${suffix}`,
      sourceHandle:       `validatetest${suffix}`,
      sourceDisplayName:  `Validate Test ${suffix}`,
    },
    vertical:        "education",
    sourcePlatform:  "directory_import",
    sourceTool:      "education_directory_import",
    sourceHashtag:   null,
    sourceHashtags:  [],
    sourcePath:      "Education / Education Directory Import / 2026-05-26",
    runId:           `validate-run-${suffix}`,
    harvestDate:     "2026-05-26",
    identity: {
      name:          `Test Person ${suffix}`,
      handle:        `validatetest${suffix}`,
      categoryGuess: "homeschool",
      locationGuess: "Austin, TX",
    },
    educationType:  "homeschool",
    audienceType:   "parent",
    sourceTopic:    null,
    platforms:      ["instagram"],
    bestMatch: {
      platform:    "instagram",
      url:         `https://instagram.com/validatetest${suffix}`,
      confidence:  45,
      matchReason: "test record",
    },
    allMatchedUrls: [
      {
        platform:    "instagram",
        url:         `https://instagram.com/validatetest${suffix}`,
        confidence:  45,
        matchReason: "test record",
      },
    ],
    services:  ["homeschool curriculum", "tutoring"],
    evidence:  [`Test evidence for ${suffix}`],
    confidence: {
      identityMatch: 60,
      bookingMatch:  45,
      categoryMatch: 50,
      locationMatch: 60,
      overall:       50,
    },
    suggestedValidationStatus: "needs_review",
  };
}

// ─── Assertions ───────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string, detail?: string) {
  if (!condition) {
    console.error(`  ✗ FAIL: ${message}${detail ? ` — ${detail}` : ""}`);
    failed++;
  } else {
    console.log(`  ✓ ${message}`);
    passed++;
  }
}

// ─── Cleanup helper ───────────────────────────────────────────────────────────

async function cleanupTestRecords(ids: string[]) {
  const backend = (await getStoreBackendInfo()).backend;

  if (backend === "postgres") {
    const { prisma } = await import("../lib/db/prisma");
    for (const id of ids) {
      await prisma.$executeRaw`DELETE FROM studio_prospects WHERE id = ${id}`;
    }
  } else {
    // JSON: reload, filter out test records, write back
    const { loadAllProspects, writeAllProspects } = await import("../lib/studios/prospects/store-json");
    const all = await loadAllProspects();
    const filtered = all.filter((r) => !ids.includes(r.prospectId));
    await writeAllProspects(filtered);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🧪  validate-prospect-store-backend.ts\n");

  // ── 0. Backend info ────────────────────────────────────────────────────────
  console.log("── 0. Backend info\n");

  const info = await getStoreBackendInfo();
  console.log(`  backend        : ${info.backend}`);
  console.log(`  storePath      : ${info.storePath ?? "(postgres — no file)"}`);
  console.log(`  envSetting     : ${info.envSetting}`);

  // ── 1. Count before ───────────────────────────────────────────────────────
  console.log("\n── 1. Pre-test count\n");

  const beforeCount = await countProspects();
  console.log(`  prospects before: ${beforeCount}`);

  // ── 2. Insert ─────────────────────────────────────────────────────────────
  console.log("\n── 2. Insert new record\n");

  const testSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const input1 = makeTestInput(testSuffix);

  const inserted = await upsertProspect(input1);
  const testId = inserted.prospectId;

  assert(!!testId, `got prospectId after insert: "${testId}"`);
  assert(inserted.identity.handle === `validatetest${testSuffix}`, `handle matches`);
  assert(inserted.status === "new", `status = "new"`);
  assert(inserted.validationStatus === "needs_review", `validationStatus = "needs_review" (suggestedValidationStatus respected)`);
  assert(inserted.notes === "", `notes = "" (empty on insert)`);
  assert(inserted.educationType === "homeschool", `educationType = "homeschool"`);
  assert(!!inserted.identityFingerprint, `identityFingerprint generated (${inserted.identityFingerprint})`);
  assert(!inserted.sourcePath.includes("Directory Import / Education Directory Import"), `sourcePath has no duplicated import labels`);

  // ── 3. Upsert (re-run same data) ──────────────────────────────────────────
  console.log("\n── 3. Upsert same handle (merge)\n");

  const input2: UpsertInput = {
    ...input1,
    identity: {
      ...input1.identity,
      name: "Updated Test Person",
      locationGuess: "Dallas, TX",
    },
    confidence: {
      ...input1.confidence,
      overall: 75,  // higher → should win
    },
    sourceHashtags: ["homeschool", "homeschoolmom"],
  };

  const upserted = await upsertProspect(input2);

  assert(upserted.prospectId === testId, `same prospectId on upsert (${upserted.prospectId})`);
  assert(upserted.identity.name === "Updated Test Person", `name updated to "Updated Test Person"`);
  assert(upserted.identity.locationGuess === "Dallas, TX", `locationGuess updated`);
  assert(upserted.confidence.overall === 75, `confidence upgraded to 75`);
  assert(
    (upserted.sourceHashtags ?? []).includes("homeschool"),
    `sourceHashtags merged: includes "homeschool"`
  );

  // ── 4. Human-set field preservation ───────────────────────────────────────
  console.log("\n── 4. Human-set validationStatus preservation\n");

  // Admin sets validationStatus to a human value
  const patched = await updateProspect(testId, {
    status:           "good_fit",
    validationStatus: "priority",
    notes:            "Looks great!",
  });

  assert(!!patched, `updateProspect returned a record`);
  assert(patched!.status === "good_fit", `status = "good_fit" after patch`);
  assert(patched!.validationStatus === "priority", `validationStatus = "priority" after patch`);
  assert(patched!.notes === "Looks great!", `notes = "Looks great!" after patch`);

  // Now re-run upsert — human-set fields must NOT be overwritten
  const input3: UpsertInput = {
    ...input1,
    suggestedValidationStatus: "needs_review",  // system wants to downgrade
    runId: "rerun-different",
  };

  const rerun = await upsertProspect(input3);

  assert(rerun.validationStatus === "priority", `validationStatus preserved as "priority" (NOT overwritten by re-run)`);
  assert(rerun.status === "good_fit", `status preserved as "good_fit" (NOT reset by re-run)`);
  assert(rerun.notes === "Looks great!", `notes preserved (NOT erased by re-run)`);

  // ── 5. Filter ─────────────────────────────────────────────────────────────
  // Note: step 4 re-run used input3 = {...input1} which resets locationGuess
  // to "Austin, TX" and runId to "rerun-different" (latest run wins on mutable
  // fields). Assertions reflect post-re-run state.
  console.log("\n── 5. Filter by sourceType + sourcePlatform\n");

  const filteredByTool = await filterProspects({
    sourceTool:     "education_directory_import",
    sourcePlatform: "directory_import",
  });

  assert(
    filteredByTool.some((r) => r.prospectId === testId),
    `filterProspects(sourceTool, sourcePlatform) found test record`
  );

  const filteredByEduType = await filterProspects({
    educationType:  "homeschool",
    sourcePlatform: "directory_import",
  });

  assert(
    filteredByEduType.some((r) => r.prospectId === testId),
    `filterProspects(educationType, sourcePlatform) found test record`
  );

  // input3 re-run restored locationGuess to "Austin, TX" (input1 value)
  const filteredByLocation = await filterProspects({ location: "Austin" });
  assert(
    filteredByLocation.some((r) => r.prospectId === testId),
    `filterProspects(location="Austin") found test record (locationGuess reset by re-run)`
  );

  // runId from last re-run is "rerun-different"
  const filteredByRunId = await filterProspects({ runId: "rerun-different" });
  assert(
    filteredByRunId.some((r) => r.prospectId === testId),
    `filterProspects(runId="rerun-different") found test record`
  );

  // ── 6. Count after ────────────────────────────────────────────────────────
  console.log("\n── 6. Post-insert count\n");

  const afterCount = await countProspects();
  console.log(`  prospects after: ${afterCount}`);
  assert(afterCount === beforeCount + 1, `count increased by 1 (${beforeCount} → ${afterCount})`);

  // ── 7. Cleanup ────────────────────────────────────────────────────────────
  console.log("\n── 7. Cleanup\n");

  await cleanupTestRecords([testId]);
  const cleanCount = await countProspects();
  console.log(`  prospects after cleanup: ${cleanCount}`);
  assert(cleanCount === beforeCount, `count restored to ${beforeCount} after cleanup`);

  // ── Result ────────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(60));
  console.log(`📊  Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.log("❌  Some assertions failed — see above.\n");
    process.exit(1);
  } else {
    console.log("✅  All assertions passed.\n");
    process.exit(0);
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
