// lib/studios/prospects/store-postgres.ts
// Postgres implementation of the prospect store using raw SQL via prisma.$queryRaw.
// Does NOT import the generated `StudioProspect` Prisma model type — the dev server
// holds query_engine-windows.dll open (EPERM), so prisma generate can't run while
// Next.js is active. All DB interaction is through $queryRaw / $executeRaw with a
// locally-defined DbProspectRow type that mirrors the studio_prospects columns.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { ProspectRecord, ProspectStatus, MatchedUrl, ProspectEvidence } from "./types";
import type { ValidationStatus } from "@/lib/studios/creator-lab/hashtag-harvest/education-config";
import {
  normalizeHandle,
  generateProspectId,
  mergeMatchedUrls,
  mergeStrings,
  mergeEvidence,
  isHumanSetValidationStatus,
  generateIdentityFingerprint,
} from "./store-json";
import type { UpsertInput, ProspectFilter } from "./store-json";

// ─── DB row shape (mirrors studio_prospects columns) ─────────────────────────
// Column names match the Prisma schema field names exactly (camelCase).

interface DbProspectRow {
  id: string;
  identityFingerprint?: string | null;
  vertical: string;
  sourcePlatform: string;
  sourceType: string;
  sourceTool: string;
  sourcePath: string;
  sourceHashtag: string | null;
  sourceHashtags: unknown;          // JSON[]
  runId: string | null;
  harvestDate: string | null;
  batchId: string;
  sourceHandle: string;
  sourceDisplayName: string;
  name: string;
  handle: string;
  categoryGuess: string | null;
  locationGuess: string | null;
  platforms: unknown;               // JSON[]
  bestMatchUrl: string | null;
  bestMatchPlatform: string | null;
  bestMatchConf: number | null;
  bestMatchReason: string | null;
  allMatchedUrls: unknown;          // JSON[]
  services: unknown;                // JSON[]
  evidence: unknown;                // JSON[]
  confIdentity: number;
  confBooking: number;
  confCategory: number;
  confLocation: number;
  confOverall: number;
  educationType: string | null;
  audienceType: string | null;
  sourceTopic: string | null;
  validationStatus: string;
  archiveReason: string | null;
  status: string;
  notes: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ─── Row ↔ ProspectRecord ────────────────────────────────────────────────────

function parseJsonCol<T>(col: unknown): T {
  if (typeof col === "string") {
    try { return JSON.parse(col) as T; } catch { return [] as unknown as T; }
  }
  return (col ?? []) as T;
}

function toIso(v: Date | string): string {
  if (v instanceof Date) return v.toISOString();
  return v;
}

function rowToRecord(row: DbProspectRow): ProspectRecord {
  const bestMatch =
    row.bestMatchUrl
      ? {
          platform:    row.bestMatchPlatform ?? "unknown",
          url:         row.bestMatchUrl,
          confidence:  row.bestMatchConf ?? 0,
          matchReason: row.bestMatchReason ?? "",
        }
      : null;

  return {
    prospectId:     row.id,
    identityFingerprint: row.identityFingerprint ?? generateIdentityFingerprint({
      handle: row.handle,
      name: row.name,
      bestMatchUrl: row.bestMatchUrl,
      sourcePlatform: row.sourcePlatform,
    }),
    createdAt:      toIso(row.createdAt),
    updatedAt:      toIso(row.updatedAt),
    source: {
      sourceType:         row.sourceType as ProspectRecord["source"]["sourceType"],
      batchId:            row.batchId,
      sourceHandle:       row.sourceHandle,
      sourceDisplayName:  row.sourceDisplayName,
    },
    vertical:       row.vertical,
    sourcePlatform: row.sourcePlatform,
    sourceTool:     row.sourceTool,
    sourcePath:     row.sourcePath,
    sourceHashtag:  row.sourceHashtag,
    sourceHashtags: parseJsonCol<string[]>(row.sourceHashtags),
    runId:          row.runId,
    harvestDate:    row.harvestDate,
    identity: {
      name:          row.name,
      handle:        row.handle,
      categoryGuess: row.categoryGuess,
      locationGuess: row.locationGuess,
    },
    platforms:      parseJsonCol<string[]>(row.platforms),
    bestMatch,
    allMatchedUrls: parseJsonCol<MatchedUrl[]>(row.allMatchedUrls),
    services:       parseJsonCol<string[]>(row.services),
    evidence:       parseJsonCol<ProspectEvidence[]>(row.evidence),
    confidence: {
      identityMatch: row.confIdentity,
      bookingMatch:  row.confBooking,
      categoryMatch: row.confCategory,
      locationMatch: row.confLocation,
      overall:       row.confOverall,
    },
    educationType:    (row.educationType  as ProspectRecord["educationType"])  ?? null,
    audienceType:     (row.audienceType   as ProspectRecord["audienceType"])   ?? null,
    sourceTopic:      row.sourceTopic     ?? null,
    validationStatus: row.validationStatus as ValidationStatus,
    archiveReason:    row.archiveReason   ?? null,
    status:           row.status          as ProspectStatus,
    notes:            row.notes,
  };
}

// ─── Find existing row (by normalized handle OR bestMatch URL) ────────────────

async function findExisting(
  incomingHandle: string,
  incomingUrls: string[],
): Promise<DbProspectRow | null> {
  const normalizedKey = normalizeHandle(incomingHandle);
  const hasValidHandle = normalizedKey.length > 2;
  const incomingUrl = incomingUrls[0] ?? null;
  const fingerprint = generateIdentityFingerprint({ handle: incomingHandle, bestMatchUrl: incomingUrl });

  const byFingerprint = await prisma.$queryRaw<DbProspectRow[]>`
    SELECT * FROM studio_prospects
    WHERE "identityFingerprint" = ${fingerprint}
    LIMIT 1
  `;
  if (byFingerprint.length > 0) return byFingerprint[0];

  // Try handle match first
  if (hasValidHandle) {
    const byHandle = await prisma.$queryRaw<DbProspectRow[]>`
      SELECT * FROM studio_prospects
      WHERE regexp_replace(lower("handle"), '[^a-z0-9]', '', 'g') = ${normalizedKey}
      LIMIT 1
    `;
    if (byHandle.length > 0) return byHandle[0];
  }

  // Try URL match (bestMatchUrl or inside allMatchedUrls JSON)
  for (const url of incomingUrls) {
    const byUrl = await prisma.$queryRaw<DbProspectRow[]>`
      SELECT * FROM studio_prospects
      WHERE "bestMatchUrl" = ${url}
         OR "allMatchedUrls"::jsonb @> ${JSON.stringify([{ url }])}::jsonb
      LIMIT 1
    `;
    if (byUrl.length > 0) return byUrl[0];
  }

  return null;
}

// ─── Upsert ───────────────────────────────────────────────────────────────────

export async function upsertProspectPostgres(incoming: UpsertInput): Promise<ProspectRecord> {
  const now = new Date().toISOString();
  const incomingUrls = Array.from(new Set([
    incoming.bestMatch?.url,
    ...(incoming.allMatchedUrls ?? []).map((u) => u.url),
  ].filter((url): url is string => !!url)));
  const incomingUrl = incomingUrls[0] ?? null;
  const incomingFingerprint = generateIdentityFingerprint({
    handle: incoming.identity.handle,
    name: incoming.identity.name,
    bestMatchUrl: incomingUrl,
    sourcePlatform: incoming.sourcePlatform,
  });

  const existing = await findExisting(incoming.identity.handle, incomingUrls);

  if (existing) {
    // ── Merge logic (mirrors store-json upsert) ───────────────────────────────
    const existingRecord = rowToRecord(existing);

    const effectiveValidationStatus: ValidationStatus =
      isHumanSetValidationStatus(existingRecord.validationStatus)
        ? existingRecord.validationStatus
        : (incoming.suggestedValidationStatus ?? existingRecord.validationStatus ?? "new");

    const mergedHashtags   = mergeStrings(existingRecord.sourceHashtags ?? [], incoming.sourceHashtags ?? []);
    const mergedPlatforms  = mergeStrings(existingRecord.platforms ?? [], incoming.platforms ?? []);
    const mergedServices   = mergeStrings(existingRecord.services, incoming.services);
    const mergedUrls       = mergeMatchedUrls(existingRecord.allMatchedUrls, incoming.allMatchedUrls);
    const mergedEvidence   = mergeEvidence(existingRecord.evidence, incoming.evidence, 20);

    const bestMatch =
      !existingRecord.bestMatch ||
      (incoming.bestMatch && incoming.bestMatch.confidence > existingRecord.bestMatch.confidence)
        ? incoming.bestMatch
        : existingRecord.bestMatch;

    const confidence =
      incoming.confidence.overall > existingRecord.confidence.overall
        ? incoming.confidence
        : existingRecord.confidence;

    const merged: ProspectRecord = {
      ...existingRecord,
      identityFingerprint: existingRecord.identityFingerprint || incomingFingerprint,
      updatedAt: now,
      identity: {
        name:          incoming.identity.name || existingRecord.identity.name,
        handle:        existingRecord.identity.handle,
        categoryGuess: incoming.identity.categoryGuess ?? existingRecord.identity.categoryGuess,
        locationGuess: incoming.identity.locationGuess ?? existingRecord.identity.locationGuess,
      },
      educationType: (incoming.educationType && incoming.educationType !== "unknown")
        ? incoming.educationType
        : existingRecord.educationType ?? null,
      audienceType: (incoming.audienceType && incoming.audienceType !== "unknown")
        ? incoming.audienceType
        : existingRecord.audienceType ?? null,
      sourceTopic:    incoming.sourceTopic    ?? existingRecord.sourceTopic    ?? null,
      vertical:       incoming.vertical       || existingRecord.vertical       || "education",
      sourcePlatform: incoming.sourcePlatform || existingRecord.sourcePlatform || "instagram",
      sourceTool:     incoming.sourceTool     || existingRecord.sourceTool     || "hashtag_harvest",
      sourceHashtag:  existingRecord.sourceHashtag  ?? incoming.sourceHashtag  ?? null,
      sourceHashtags: mergedHashtags,
      sourcePath:     existingRecord.sourcePath     || incoming.sourcePath     || "",
      runId:          incoming.runId          ?? existingRecord.runId          ?? null,
      harvestDate:    existingRecord.harvestDate    ?? incoming.harvestDate    ?? null,
      bestMatch,
      platforms:      mergedPlatforms,
      services:       mergedServices,
      allMatchedUrls: mergedUrls,
      evidence:       mergedEvidence,
      confidence,
      // ── Human-set fields: NEVER overwrite ──────────────────────────────────
      validationStatus: effectiveValidationStatus,
      archiveReason:    existingRecord.archiveReason ?? null,
      status:           existingRecord.status,
      notes:            existingRecord.notes,
    };

    await prisma.$executeRaw`
      UPDATE studio_prospects SET
        "updatedAt"        = NOW(),
        "identityFingerprint" = ${merged.identityFingerprint},
        "name"             = ${merged.identity.name},
        "categoryGuess"    = ${merged.identity.categoryGuess},
        "locationGuess"    = ${merged.identity.locationGuess},
        "educationType"    = ${merged.educationType},
        "audienceType"     = ${merged.audienceType},
        "sourceTopic"      = ${merged.sourceTopic},
        "vertical"         = ${merged.vertical},
        "sourcePlatform"   = ${merged.sourcePlatform},
        "sourceTool"       = ${merged.sourceTool},
        "sourceHashtag"    = ${merged.sourceHashtag},
        "sourceHashtags"   = ${JSON.stringify(merged.sourceHashtags)}::jsonb,
        "sourcePath"       = ${merged.sourcePath},
        "runId"            = ${merged.runId},
        "harvestDate"      = ${merged.harvestDate},
        "bestMatchUrl"     = ${merged.bestMatch?.url ?? null},
        "bestMatchPlatform"= ${merged.bestMatch?.platform ?? null},
        "bestMatchConf"    = ${merged.bestMatch?.confidence ?? null},
        "bestMatchReason"  = ${merged.bestMatch?.matchReason ?? null},
        "platforms"        = ${JSON.stringify(merged.platforms)}::jsonb,
        "services"         = ${JSON.stringify(merged.services)}::jsonb,
        "allMatchedUrls"   = ${JSON.stringify(merged.allMatchedUrls)}::jsonb,
        "evidence"         = ${JSON.stringify(merged.evidence)}::jsonb,
        "confIdentity"     = ${merged.confidence.identityMatch},
        "confBooking"      = ${merged.confidence.bookingMatch},
        "confCategory"     = ${merged.confidence.categoryMatch},
        "confLocation"     = ${merged.confidence.locationMatch},
        "confOverall"      = ${merged.confidence.overall}
      WHERE id = ${existing.id}
    `;

    return merged;
  }

  // ── New record ────────────────────────────────────────────────────────────────
  const newRecord: ProspectRecord = {
    ...incoming,
    prospectId:     generateProspectId(incoming.identity.handle),
    identityFingerprint: incomingFingerprint,
    createdAt:      now,
    updatedAt:      now,
    vertical:       incoming.vertical       || "education",
    sourcePlatform: incoming.sourcePlatform || "instagram",
    sourceTool:     incoming.sourceTool     || "hashtag_harvest",
    sourceHashtag:  incoming.sourceHashtag  ?? null,
    sourceHashtags: incoming.sourceHashtags ?? [],
    sourcePath:     incoming.sourcePath     || "",
    runId:          incoming.runId          ?? null,
    harvestDate:    incoming.harvestDate    ?? null,
    educationType:  incoming.educationType  ?? null,
    audienceType:   incoming.audienceType   ?? null,
    sourceTopic:    incoming.sourceTopic    ?? null,
    platforms:      incoming.platforms      ?? [],
    validationStatus: incoming.suggestedValidationStatus ?? "new",
    archiveReason:  null,
    status:         "new",
    notes:          "",
  };

  await prisma.$executeRaw`
    INSERT INTO studio_prospects (
      "id", "identityFingerprint", "vertical", "sourcePlatform", "sourceType", "sourceTool",
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
      ${newRecord.prospectId},
      ${newRecord.identityFingerprint},
      ${newRecord.vertical},
      ${newRecord.sourcePlatform},
      ${newRecord.source.sourceType},
      ${newRecord.sourceTool},
      ${newRecord.sourcePath},
      ${newRecord.sourceHashtag},
      ${JSON.stringify(newRecord.sourceHashtags)}::jsonb,
      ${newRecord.runId},
      ${newRecord.harvestDate},
      ${newRecord.source.batchId},
      ${newRecord.source.sourceHandle},
      ${newRecord.source.sourceDisplayName},
      ${newRecord.identity.name},
      ${newRecord.identity.handle},
      ${newRecord.identity.categoryGuess},
      ${newRecord.identity.locationGuess},
      ${JSON.stringify(newRecord.platforms)}::jsonb,
      ${newRecord.bestMatch?.url ?? null},
      ${newRecord.bestMatch?.platform ?? null},
      ${newRecord.bestMatch?.confidence ?? null},
      ${newRecord.bestMatch?.matchReason ?? null},
      ${JSON.stringify(newRecord.allMatchedUrls)}::jsonb,
      ${JSON.stringify(newRecord.services)}::jsonb,
      ${JSON.stringify(newRecord.evidence)}::jsonb,
      ${newRecord.confidence.identityMatch},
      ${newRecord.confidence.bookingMatch},
      ${newRecord.confidence.categoryMatch},
      ${newRecord.confidence.locationMatch},
      ${newRecord.confidence.overall},
      ${newRecord.educationType},
      ${newRecord.audienceType},
      ${newRecord.sourceTopic},
      ${newRecord.validationStatus},
      ${newRecord.archiveReason},
      ${newRecord.status},
      ${newRecord.notes},
      NOW(),
      NOW()
    )
  `;

  return newRecord;
}

// ─── Update (admin patch) ─────────────────────────────────────────────────────

export async function updateProspectPostgres(
  prospectId: string,
  patch: Partial<Pick<ProspectRecord, "status" | "notes" | "validationStatus" | "archiveReason">>
): Promise<ProspectRecord | null> {
  const rows = await prisma.$queryRaw<DbProspectRow[]>`
    SELECT * FROM studio_prospects WHERE id = ${prospectId} LIMIT 1
  `;
  if (rows.length === 0) return null;

  const current = rowToRecord(rows[0]);
  const updated: ProspectRecord = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  await prisma.$executeRaw`
    UPDATE studio_prospects SET
      "status"          = ${updated.status},
      "notes"           = ${updated.notes},
      "validationStatus"= ${updated.validationStatus},
      "archiveReason"   = ${updated.archiveReason},
      "updatedAt"       = NOW()
    WHERE id = ${prospectId}
  `;

  return updated;
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listProspectsPostgres(): Promise<ProspectRecord[]> {
  const rows = await prisma.$queryRaw<DbProspectRow[]>`
    SELECT * FROM studio_prospects ORDER BY "createdAt" DESC
  `;
  return rows.map(rowToRecord);
}

// ─── Filter ───────────────────────────────────────────────────────────────────

export async function filterProspectsPostgres(filter: ProspectFilter): Promise<ProspectRecord[]> {
  // Build conditions array for dynamic WHERE clause
  const conditions: Prisma.Sql[] = [];

  if (filter.vertical)
    conditions.push(Prisma.sql`"vertical" = ${filter.vertical}`);

  if (filter.educationType)
    conditions.push(Prisma.sql`"educationType" = ${filter.educationType}`);

  if (filter.audienceType)
    conditions.push(Prisma.sql`"audienceType" = ${filter.audienceType}`);

  if (filter.sourceHashtag)
    conditions.push(Prisma.sql`"sourceHashtag" = ${filter.sourceHashtag}`);

  if (filter.validationStatus)
    conditions.push(Prisma.sql`COALESCE("validationStatus", 'new') = ${filter.validationStatus}`);

  if (filter.platform)
    conditions.push(Prisma.sql`"bestMatchPlatform" = ${filter.platform}`);

  if (filter.sourceType)
    conditions.push(Prisma.sql`"sourceType" = ${filter.sourceType}`);

  if (filter.sourcePlatform)
    conditions.push(Prisma.sql`"sourcePlatform" = ${filter.sourcePlatform}`);

  if (filter.sourceTool)
    conditions.push(Prisma.sql`"sourceTool" = ${filter.sourceTool}`);

  if (filter.runId)
    conditions.push(Prisma.sql`"runId" = ${filter.runId}`);

  if (filter.location)
    conditions.push(Prisma.sql`lower("locationGuess") LIKE ${"%" + filter.location.toLowerCase() + "%"}`);

  if (filter.minConfidence !== undefined)
    conditions.push(Prisma.sql`"confOverall" >= ${filter.minConfidence}`);

  const where =
    conditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
      : Prisma.sql``;

  const rows = await prisma.$queryRaw<DbProspectRow[]>`
    SELECT * FROM studio_prospects ${where} ORDER BY "createdAt" DESC
  `;
  return rows.map(rowToRecord);
}

// ─── Count ────────────────────────────────────────────────────────────────────

export async function countProspectsPostgres(): Promise<number> {
  const result = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM studio_prospects
  `;
  return Number(result[0]?.count ?? 0);
}

// ─── Table health check (used by auto-detection) ─────────────────────────────

export async function checkPostgresTableExists(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1 FROM studio_prospects LIMIT 1`;
    return true;
  } catch {
    return false;
  }
}

export type { UpsertInput, ProspectFilter };
