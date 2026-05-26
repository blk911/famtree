#!/usr/bin/env tsx
// scripts/migrate-prospects-json-to-postgres.ts
// One-shot migration: reads the JSON flat-file prospect store and upserts all
// records into the Postgres studio_prospects table.
//
// Usage:
//   npx tsx scripts/migrate-prospects-json-to-postgres.ts           # live run
//   npx tsx scripts/migrate-prospects-json-to-postgres.ts --dry-run # print stats, no writes
//
// Requirements:
//   - DATABASE_URL must be set and point to a Postgres DB with studio_prospects table
//   - Run `npm run db:push` first if the table doesn't exist yet

import path from "path";
import { promises as fs } from "fs";

// ─── Parse args ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run") || args.includes("-n");

console.log(`\n📦  Prospect JSON → Postgres migration${dryRun ? " (DRY RUN — no writes)" : ""}`);
console.log(`    ${new Date().toISOString()}\n`);

// ─── Resolve JSON store path ──────────────────────────────────────────────────
const DATA_DIR = process.env.VERCEL
  ? "/tmp/studios-prospects"
  : path.resolve(process.cwd(), "runtime-data", "studios", "prospects");
const PROSPECTS_FILE = path.join(DATA_DIR, "prospects.json");

async function loadJsonRecords() {
  try {
    const raw = await fs.readFile(PROSPECTS_FILE, "utf-8");
    return JSON.parse(raw) as import("../lib/studios/prospects/types").ProspectRecord[];
  } catch {
    return [];
  }
}

// ─── Postgres upsert helper ───────────────────────────────────────────────────

async function upsertToPostgres(
  record: import("../lib/studios/prospects/types").ProspectRecord,
): Promise<void> {
  const { prisma } = await import("../lib/db/prisma");

  // Check for existing by ID first (most reliable)
  const existing = await prisma.$queryRaw<[{ id: string }?]>`
    SELECT id FROM studio_prospects WHERE id = ${record.prospectId} LIMIT 1
  `;

  if (existing.length > 0) {
    // Update everything except human-set fields
    await prisma.$executeRaw`
      UPDATE studio_prospects SET
        "updatedAt"         = NOW(),
        "name"              = ${record.identity.name},
        "handle"            = ${record.identity.handle},
        "categoryGuess"     = ${record.identity.categoryGuess},
        "locationGuess"     = ${record.identity.locationGuess},
        "vertical"          = ${record.vertical},
        "sourcePlatform"    = ${record.sourcePlatform},
        "sourceType"        = ${record.source.sourceType},
        "sourceTool"        = ${record.sourceTool},
        "sourcePath"        = ${record.sourcePath},
        "sourceHashtag"     = ${record.sourceHashtag},
        "sourceHashtags"    = ${JSON.stringify(record.sourceHashtags ?? [])}::jsonb,
        "runId"             = ${record.runId},
        "harvestDate"       = ${record.harvestDate},
        "batchId"           = ${record.source.batchId},
        "sourceHandle"      = ${record.source.sourceHandle},
        "sourceDisplayName" = ${record.source.sourceDisplayName},
        "platforms"         = ${JSON.stringify(record.platforms ?? [])}::jsonb,
        "bestMatchUrl"      = ${record.bestMatch?.url ?? null},
        "bestMatchPlatform" = ${record.bestMatch?.platform ?? null},
        "bestMatchConf"     = ${record.bestMatch?.confidence ?? null},
        "bestMatchReason"   = ${record.bestMatch?.matchReason ?? null},
        "allMatchedUrls"    = ${JSON.stringify(record.allMatchedUrls ?? [])}::jsonb,
        "services"          = ${JSON.stringify(record.services ?? [])}::jsonb,
        "evidence"          = ${JSON.stringify(record.evidence ?? [])}::jsonb,
        "confIdentity"      = ${record.confidence.identityMatch},
        "confBooking"       = ${record.confidence.bookingMatch},
        "confCategory"      = ${record.confidence.categoryMatch},
        "confLocation"      = ${record.confidence.locationMatch},
        "confOverall"       = ${record.confidence.overall},
        "educationType"     = ${record.educationType},
        "audienceType"      = ${record.audienceType},
        "sourceTopic"       = ${record.sourceTopic},
        "status"            = ${record.status},
        "notes"             = ${record.notes},
        "validationStatus"  = ${record.validationStatus},
        "archiveReason"     = ${record.archiveReason}
      WHERE id = ${record.prospectId}
    `;
  } else {
    await prisma.$executeRaw`
      INSERT INTO studio_prospects (
        "id", "vertical", "sourcePlatform", "sourceType", "sourceTool",
        "sourcePath", "sourceHashtag", "sourceHashtags", "runId", "harvestDate",
        "batchId", "sourceHandle", "sourceDisplayName",
        "name", "handle", "categoryGuess", "locationGuess",
        "platforms", "bestMatchUrl", "bestMatchPlatform", "bestMatchConf", "bestMatchReason",
        "allMatchedUrls", "services", "evidence",
        "confIdentity", "confBooking", "confCategory", "confLocation", "confOverall",
        "educationType", "audienceType", "sourceTopic",
        "validationStatus", "archiveReason", "status", "notes",
        "createdAt", "updatedAt"
      ) VALUES (
        ${record.prospectId},
        ${record.vertical},
        ${record.sourcePlatform},
        ${record.source.sourceType},
        ${record.sourceTool},
        ${record.sourcePath},
        ${record.sourceHashtag},
        ${JSON.stringify(record.sourceHashtags ?? [])}::jsonb,
        ${record.runId},
        ${record.harvestDate},
        ${record.source.batchId},
        ${record.source.sourceHandle},
        ${record.source.sourceDisplayName},
        ${record.identity.name},
        ${record.identity.handle},
        ${record.identity.categoryGuess},
        ${record.identity.locationGuess},
        ${JSON.stringify(record.platforms ?? [])}::jsonb,
        ${record.bestMatch?.url ?? null},
        ${record.bestMatch?.platform ?? null},
        ${record.bestMatch?.confidence ?? null},
        ${record.bestMatch?.matchReason ?? null},
        ${JSON.stringify(record.allMatchedUrls ?? [])}::jsonb,
        ${JSON.stringify(record.services ?? [])}::jsonb,
        ${JSON.stringify(record.evidence ?? [])}::jsonb,
        ${record.confidence.identityMatch},
        ${record.confidence.bookingMatch},
        ${record.confidence.categoryMatch},
        ${record.confidence.locationMatch},
        ${record.confidence.overall},
        ${record.educationType},
        ${record.audienceType},
        ${record.sourceTopic},
        ${record.validationStatus},
        ${record.archiveReason},
        ${record.status},
        ${record.notes},
        ${new Date(record.createdAt)},
        ${new Date(record.updatedAt)}
      )
    `;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌  DATABASE_URL is not set. Cannot connect to Postgres.");
    process.exit(1);
  }

  // Load JSON records
  console.log(`📂  Reading: ${PROSPECTS_FILE}`);
  const records = await loadJsonRecords();

  if (records.length === 0) {
    console.log("ℹ️   No records found in JSON store — nothing to migrate.");
    process.exit(0);
  }

  console.log(`📋  Found ${records.length} records in JSON store\n`);

  // Verify Postgres table exists
  if (!dryRun) {
    try {
      const { prisma } = await import("../lib/db/prisma");
      await prisma.$queryRaw`SELECT 1 FROM studio_prospects LIMIT 1`;
      console.log("✅  Postgres table studio_prospects is accessible\n");
    } catch (e) {
      console.error(
        "❌  Cannot access studio_prospects table.\n" +
        "    Run `npm run db:push` first to create the table.\n" +
        `    Error: ${e instanceof Error ? e.message : String(e)}`
      );
      process.exit(1);
    }
  }

  // Migrate
  let inserted = 0;
  let updated  = 0;
  let failed   = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const label = r.identity?.handle || r.prospectId || `record-${i}`;

    if (dryRun) {
      console.log(`  [dry-run] would upsert "${label}" (id=${r.prospectId})`);
      inserted++;
      continue;
    }

    try {
      const { prisma } = await import("../lib/db/prisma");
      const existing = await prisma.$queryRaw<[{ id: string }?]>`
        SELECT id FROM studio_prospects WHERE id = ${r.prospectId} LIMIT 1
      `;
      const isUpdate = existing.length > 0;

      await upsertToPostgres(r);

      if (isUpdate) {
        updated++;
        process.stdout.write(`  ↻ updated  "${label}"\n`);
      } else {
        inserted++;
        process.stdout.write(`  + inserted "${label}"\n`);
      }
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      errors.push({ id: r.prospectId, error: msg });
      console.error(`  ✗ FAILED   "${label}": ${msg}`);
    }
  }

  // Summary
  console.log("\n" + "─".repeat(60));
  console.log(`📊  Migration ${dryRun ? "(dry run) " : ""}complete:`);
  console.log(`    Total records : ${records.length}`);
  if (!dryRun) {
    console.log(`    Inserted      : ${inserted}`);
    console.log(`    Updated       : ${updated}`);
    console.log(`    Failed        : ${failed}`);
  } else {
    console.log(`    Would upsert  : ${inserted}`);
  }

  if (errors.length > 0) {
    console.log("\n⚠️   Errors:");
    for (const e of errors) console.log(`    ${e.id}: ${e.error}`);
    process.exit(1);
  }

  if (!dryRun) {
    console.log("\n✅  Migration complete. Verify with:");
    console.log("    npx tsx scripts/validate-prospect-store-backend.ts");
  }

  process.exit(0);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
