// scripts/validate-prospect-store.ts
// Quick integration test for the flat-JSON prospect store.
// Run: npx tsx scripts/validate-prospect-store.ts
//
// Tests:
//  1. Sequential upserts all save (no race condition)
//  2. sourceHashtags accumulate on re-upsert
//  3. Human-set validationStatus is NOT overwritten on re-upsert
//  4. Archive does not delete records

import { upsertProspect, loadAllProspects, updateProspect } from "../lib/studios/prospects/store";
import { generateIdentityFingerprint } from "../lib/studios/prospects/store-json";
import type { UpsertInput } from "../lib/studios/prospects/store";

const BASE: Omit<UpsertInput, "source" | "identity"> = {
  vertical: "education",
  sourcePlatform: "instagram",
  sourceTool: "hashtag_harvest",
  sourceHashtag: "homeschool",
  sourceHashtags: ["homeschool"],
  sourcePath: "Education / Instagram / Hashtag Harvest / 2026-05-26 / #homeschool",
  runId: "validate-run-001",
  harvestDate: "2026-05-26",
  educationType: "homeschool",
  audienceType: "parent",
  sourceTopic: null,
  platforms: [],
  bestMatch: null,
  services: [],
  allMatchedUrls: [],
  evidence: ["bio mentions homeschool"],
  confidence: { identityMatch: 0, bookingMatch: 0, categoryMatch: 0, locationMatch: 0, overall: 0 },
  suggestedValidationStatus: "needs_review",
};

function seed(handle: string, hashtag: string): UpsertInput {
  return {
    ...BASE,
    sourceHashtag: hashtag,
    sourceHashtags: [hashtag],
    source: {
      sourceType: "hashtag_harvest",
      batchId: "validate-batch-001",
      sourceHandle: handle,
      sourceDisplayName: handle,
    },
    identity: {
      name: handle,
      handle,
      categoryGuess: "Homeschool",
      locationGuess: "Denver, CO",
    },
  };
}

async function run() {
  console.log("\n── Prospect Store Validation ─────────────────────────────\n");

  // ── Test 1: Sequential upserts — all should save ──────────────────────────
  console.log("Test 1: Upsert 7 seeds sequentially…");
  const handles = ["@hsvalidate1", "@hsvalidate2", "@hsvalidate3", "@hsvalidate4",
                   "@hsvalidate5", "@hsvalidate6", "@hsvalidate7"];
  const hashtags = ["homeschool", "homeschoolmom", "microschool", "learningpod",
                    "mathtutor", "classicaleducation", "dyslexia"];

  for (let i = 0; i < handles.length; i++) {
    const saved = await upsertProspect(seed(handles[i], hashtags[i]));
    console.log(`  ✓ @${handles[i]} → ${saved.prospectId}`);
  }

  const after1 = await loadAllProspects();
  const testRecords = after1.filter((p) => p.identity.handle.startsWith("@hsvalidate"));
  console.log(`  → ${testRecords.length}/${handles.length} records saved`);
  if (testRecords.length !== handles.length) {
    console.error(`  ✗ FAIL: expected ${handles.length}, got ${testRecords.length}`);
    process.exit(1);
  }
  console.log("  ✓ PASS\n");

  // ── Test 2: Re-upsert same handle with different hashtag — sourceHashtags should accumulate ──
  console.log("Test 2: Re-upsert same handle under different hashtag → sourceHashtags accumulate…");
  const re = await upsertProspect({
    ...seed("@hsvalidate1", "homeschoolmom"),
    sourceHashtags: ["homeschoolmom"],
  });
  const merged = re.sourceHashtags ?? [];
  if (!merged.includes("homeschool") || !merged.includes("homeschoolmom")) {
    console.error("  ✗ FAIL: sourceHashtags did not merge:", merged);
    process.exit(1);
  }
  const expectedFingerprint = generateIdentityFingerprint({
    handle: re.identity.handle,
    name: re.identity.name,
    bestMatchUrl: re.bestMatch?.url,
    sourcePlatform: re.sourcePlatform,
  });
  if (re.identityFingerprint !== expectedFingerprint) {
    console.error(`  ✗ FAIL: identityFingerprint="${re.identityFingerprint}", expected="${expectedFingerprint}"`);
    process.exit(1);
  }
  console.log(`  ✓ PASS — sourceHashtags: [${merged.join(", ")}], identityFingerprint="${re.identityFingerprint}"\n`);

  // ── Test 3: Human-set validationStatus preserved on re-upsert ─────────────
  console.log("Test 3: Human-set validationStatus not overwritten on re-upsert…");
  const rec1 = testRecords.find((p) => p.identity.handle === "@hsvalidate2")!;
  await updateProspect(rec1.prospectId, { validationStatus: "priority" });

  // Re-upsert same seed — system suggests "needs_review"
  const reUpserted = await upsertProspect(seed("@hsvalidate2", "homeschoolmom"));
  if (reUpserted.validationStatus !== "priority") {
    console.error("  ✗ FAIL: human-set validationStatus was overwritten:", reUpserted.validationStatus);
    process.exit(1);
  }
  console.log(`  ✓ PASS — validationStatus remains "priority" after re-upsert\n`);

  // ── Test 4: Archive does not delete the record ─────────────────────────────
  console.log("Test 4: Archive sets validationStatus=archive + archiveReason, does not delete…");
  const rec2 = testRecords.find((p) => p.identity.handle === "@hsvalidate3")!;
  const archived = await updateProspect(rec2.prospectId, {
    validationStatus: "archive",
    archiveReason: "not_education",
  });
  const allAfterArchive = await loadAllProspects();
  const stillThere = allAfterArchive.find((p) => p.prospectId === rec2.prospectId);
  if (!stillThere || stillThere.validationStatus !== "archive") {
    console.error("  ✗ FAIL: archived record missing or status wrong:", stillThere);
    process.exit(1);
  }
  console.log(`  ✓ PASS — record retained, validationStatus="archive", archiveReason="${stillThere.archiveReason}"\n`);

  // ── Test 5: sourcePath format ─────────────────────────────────────────────
  console.log("Test 5: sourcePath format check…");
  const anyRec = testRecords[0];
  const expected = "Education / Instagram / Hashtag Harvest / 2026-05-26 / #homeschool";
  if (anyRec.sourcePath !== expected) {
    console.error(`  ✗ FAIL: sourcePath="${anyRec.sourcePath}", expected="${expected}"`);
    process.exit(1);
  }
  console.log(`  ✓ PASS — sourcePath="${anyRec.sourcePath}"\n`);

  // ── Summary ────────────────────────────────────────────────────────────────
  const allFinal = await loadAllProspects();
  console.log(`── Validation complete ────────────────────────────────────`);
  console.log(`   Total records in store: ${allFinal.length}`);
  console.log(`   Test records: ${allFinal.filter((p) => p.identity.handle.startsWith("@hsvalidate")).length}`);
  console.log(`\nAll tests passed. ✓\n`);
}

run().catch((e) => {
  console.error("Validation script error:", e);
  process.exit(1);
});
