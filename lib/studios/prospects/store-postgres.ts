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
import { classifyRelationshipOpportunity } from "./opportunity-classifier";
import {
  normalizeHandle,
  generateProspectId,
  mergeMatchedUrls,
  mergeStrings,
  mergeEvidence,
  isHumanSetValidationStatus,
  generateIdentityFingerprint,
  applyBookingDetection,
} from "./store-json";
import { enrichProspectBookingIfMissing } from "@/lib/intelligence/salon/booking-from-trail";
import { hydrateProspectUrlFields } from "@/lib/intelligence/salon/business-stack/collect-urls";
import { isSalonImportCandidate } from "@/lib/intelligence/salon/import-candidate";
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
  business_category?: string | null;
  business_subcategory?: string | null;
  relationship_opportunity_type?: string | null;
  relationship_score?: number | null;
  audience_score?: number | null;
  operational_data_score?: number | null;
  community_score?: number | null;
  overall_opportunity_score?: number | null;
  offer_fit_tags?: unknown;
  platform_signals?: unknown;
  category_confidence?: number | null;
  classification_notes?: unknown;
  classification_locked?: boolean | null;
  businessCategory?: string | null;
  businessSubcategory?: string | null;
  relationshipOpportunityType?: string | null;
  relationshipScore?: number | null;
  audienceScore?: number | null;
  operationalDataScore?: number | null;
  communityScore?: number | null;
  overallOpportunityScore?: number | null;
  offerFitTags?: unknown;
  platformSignals?: unknown;
  categoryConfidence?: number | null;
  classificationNotes?: unknown;
  classificationLocked?: boolean | null;
  booking_provider?: string | null;
  booking_provider_label?: string | null;
  booking_url?: string | null;
  booking_provider_confidence?: number | null;
  booking_provider_evidence?: unknown;
  booking_provider_source?: string | null;
  gg_resolver_status?: string | null;
  gg_checked_urls?: unknown;
  gg_candidate_urls?: unknown;
  gg_validated_url?: string | null;
  gg_validation_status?: string | null;
  gg_resolver_reason?: string | null;
  provider_resolver_reason?: string | null;
  provider_discovery_debug?: unknown;
  bookingProvider?: string | null;
  bookingProviderLabel?: string | null;
  bookingUrl?: string | null;
  bookingProviderConfidence?: number | null;
  bookingProviderEvidence?: unknown;
  validationStatus: string;
  archiveReason: string | null;
  status: string;
  notes: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

type ClassificationFields = Pick<ProspectRecord,
  "businessCategory" | "businessSubcategory" | "relationshipOpportunityType" |
  "relationshipScore" | "audienceScore" | "operationalDataScore" | "communityScore" |
  "overallOpportunityScore" | "offerFitTags" | "platformSignals" | "categoryConfidence" |
  "classificationNotes" | "classificationLocked"
>;

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

  const base: ProspectRecord = {
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
    businessCategory: row.business_category ?? row.businessCategory ?? null,
    businessSubcategory: row.business_subcategory ?? row.businessSubcategory ?? null,
    relationshipOpportunityType: row.relationship_opportunity_type ?? row.relationshipOpportunityType ?? null,
    relationshipScore: row.relationship_score ?? row.relationshipScore ?? null,
    audienceScore: row.audience_score ?? row.audienceScore ?? null,
    operationalDataScore: row.operational_data_score ?? row.operationalDataScore ?? null,
    communityScore: row.community_score ?? row.communityScore ?? null,
    overallOpportunityScore: row.overall_opportunity_score ?? row.overallOpportunityScore ?? null,
    offerFitTags: parseJsonCol<string[]>(row.offer_fit_tags ?? row.offerFitTags),
    platformSignals: parseJsonCol<string[]>(row.platform_signals ?? row.platformSignals),
    categoryConfidence: row.category_confidence ?? row.categoryConfidence ?? null,
    classificationNotes: parseJsonCol<string[]>(row.classification_notes ?? row.classificationNotes),
    classificationLocked: row.classification_locked ?? row.classificationLocked ?? false,
    bookingProvider: row.booking_provider ?? row.bookingProvider ?? undefined,
    bookingProviderLabel: row.booking_provider_label ?? row.bookingProviderLabel ?? undefined,
    bookingUrl: row.booking_url ?? row.bookingUrl ?? undefined,
    bookingProviderConfidence: row.booking_provider_confidence ?? row.bookingProviderConfidence ?? undefined,
    bookingProviderEvidence: parseJsonCol<string[]>(row.booking_provider_evidence ?? row.bookingProviderEvidence),
    bookingProviderSource: (row.booking_provider_source ?? undefined) as ProspectRecord["bookingProviderSource"],
    ggResolverStatus: (row.gg_resolver_status ?? undefined) as ProspectRecord["ggResolverStatus"],
    ggCheckedUrls: parseJsonCol<string[]>(row.gg_checked_urls),
    ggCandidateUrls: parseJsonCol<string[]>(row.gg_candidate_urls),
    ggValidatedUrl: row.gg_validated_url ?? undefined,
    ggValidationStatus: (row.gg_validation_status ?? undefined) as ProspectRecord["ggValidationStatus"],
    ggResolverReason: row.gg_resolver_reason ?? undefined,
    providerResolverReason: row.provider_resolver_reason ?? undefined,
    providerDiscoveryDebug: parseJsonCol<ProspectRecord["providerDiscoveryDebug"]>(
      row.provider_discovery_debug,
    ),
    validationStatus: row.validationStatus as ValidationStatus,
    archiveReason:    row.archiveReason   ?? null,
    status:           row.status          as ProspectStatus,
    notes:            row.notes,
  };

  return hydrateProspectUrlFields(base);
}

function buildClassification(record: Partial<ProspectRecord> & UpsertInput): ClassificationFields {
  if (record.classificationLocked) return {};
  return classifyRelationshipOpportunity({
    handle: record.identity?.handle,
    displayName: record.identity?.name,
    description: [
      record.identity?.categoryGuess,
      record.sourceTopic,
      ...(record.services ?? []),
    ].filter(Boolean).join(" "),
    sourceHashtags: record.sourceHashtags,
    sourcePath: record.sourcePath,
    bestUrl: record.bestMatch?.url,
    allMatchedUrls: record.allMatchedUrls?.map((url) => url.url),
    platforms: record.platforms,
    evidence: record.evidence,
    vertical: record.vertical,
    category: record.identity?.categoryGuess ?? undefined,
    educationType: record.educationType,
    audienceType: record.audienceType,
    bookingProvider: record.bookingProvider,
    bookingProviderConfidence: record.bookingProviderConfidence,
  });
}

function mergeClassification(existing: ProspectRecord, incoming: UpsertInput): ClassificationFields {
  if (existing.classificationLocked) {
    return {
      businessCategory: existing.businessCategory,
      businessSubcategory: existing.businessSubcategory,
      relationshipOpportunityType: existing.relationshipOpportunityType,
      relationshipScore: existing.relationshipScore,
      audienceScore: existing.audienceScore,
      operationalDataScore: existing.operationalDataScore,
      communityScore: existing.communityScore,
      overallOpportunityScore: existing.overallOpportunityScore,
      offerFitTags: existing.offerFitTags ?? [],
      platformSignals: existing.platformSignals ?? [],
      categoryConfidence: existing.categoryConfidence,
      classificationNotes: existing.classificationNotes ?? [],
      classificationLocked: existing.classificationLocked,
    };
  }
  return {
    ...buildClassification(incoming),
    classificationLocked: incoming.classificationLocked ?? existing.classificationLocked ?? false,
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
  const incomingWithBooking = applyBookingDetection(incoming);
  const incomingUrls = Array.from(new Set([
    incomingWithBooking.bestMatch?.url,
    ...(incomingWithBooking.allMatchedUrls ?? []).map((u) => u.url),
  ].filter((url): url is string => !!url)));
  const incomingUrl = incomingUrls[0] ?? null;
  const incomingFingerprint = generateIdentityFingerprint({
    handle: incomingWithBooking.identity.handle,
    name: incomingWithBooking.identity.name,
    bestMatchUrl: incomingUrl,
    sourcePlatform: incomingWithBooking.sourcePlatform,
  });

  const existing = await findExisting(incomingWithBooking.identity.handle, incomingUrls);

  if (existing) {
    // ── Merge logic (mirrors store-json upsert) ───────────────────────────────
    const existingRecord = rowToRecord(existing);

    const effectiveValidationStatus: ValidationStatus =
      isHumanSetValidationStatus(existingRecord.validationStatus)
        ? existingRecord.validationStatus
        : (incomingWithBooking.suggestedValidationStatus ?? existingRecord.validationStatus ?? "new");

    const mergedHashtags   = mergeStrings(existingRecord.sourceHashtags ?? [], incomingWithBooking.sourceHashtags ?? []);
    const mergedPlatforms  = mergeStrings(existingRecord.platforms ?? [], incomingWithBooking.platforms ?? []);
    const mergedServices   = mergeStrings(existingRecord.services, incomingWithBooking.services);
    const mergedUrls       = mergeMatchedUrls(existingRecord.allMatchedUrls, incomingWithBooking.allMatchedUrls);
    const mergedEvidence   = mergeEvidence(existingRecord.evidence, incomingWithBooking.evidence, 20);

    const bestMatch =
      !existingRecord.bestMatch ||
      (incomingWithBooking.bestMatch && incomingWithBooking.bestMatch.confidence > existingRecord.bestMatch.confidence)
        ? incomingWithBooking.bestMatch
        : existingRecord.bestMatch;

    const confidence =
      incomingWithBooking.confidence.overall > existingRecord.confidence.overall
        ? incomingWithBooking.confidence
        : existingRecord.confidence;

    const merged: ProspectRecord = applyBookingDetection({
      ...existingRecord,
      ...mergeClassification(existingRecord, incomingWithBooking),
      identityFingerprint: existingRecord.identityFingerprint || incomingFingerprint,
      updatedAt: now,
      identity: {
        name:          incomingWithBooking.identity.name || existingRecord.identity.name,
        handle:        existingRecord.identity.handle,
        categoryGuess: incomingWithBooking.identity.categoryGuess ?? existingRecord.identity.categoryGuess,
        locationGuess: incomingWithBooking.identity.locationGuess ?? existingRecord.identity.locationGuess,
      },
      educationType: (incomingWithBooking.educationType && incomingWithBooking.educationType !== "unknown")
        ? incomingWithBooking.educationType
        : existingRecord.educationType ?? null,
      audienceType: (incomingWithBooking.audienceType && incomingWithBooking.audienceType !== "unknown")
        ? incomingWithBooking.audienceType
        : existingRecord.audienceType ?? null,
      sourceTopic:    incomingWithBooking.sourceTopic    ?? existingRecord.sourceTopic    ?? null,
      vertical:       incomingWithBooking.vertical       || existingRecord.vertical       || "education",
      sourcePlatform: incomingWithBooking.sourcePlatform || existingRecord.sourcePlatform || "instagram",
      sourceTool:     incomingWithBooking.sourceTool     || existingRecord.sourceTool     || "hashtag_harvest",
      sourceHashtag:  existingRecord.sourceHashtag  ?? incomingWithBooking.sourceHashtag  ?? null,
      sourceHashtags: mergedHashtags,
      sourcePath:     existingRecord.sourcePath     || incomingWithBooking.sourcePath     || "",
      runId:          incomingWithBooking.runId          ?? existingRecord.runId          ?? null,
      harvestDate:    existingRecord.harvestDate    ?? incomingWithBooking.harvestDate    ?? null,
      bestMatch,
      platforms:      mergedPlatforms,
      services:       mergedServices,
      allMatchedUrls: mergedUrls,
      evidence:       mergedEvidence,
      confidence,
      bookingProvider: incomingWithBooking.bookingProvider ?? existingRecord.bookingProvider,
      bookingProviderLabel: incomingWithBooking.bookingProviderLabel ?? existingRecord.bookingProviderLabel,
      bookingUrl: incomingWithBooking.bookingUrl ?? existingRecord.bookingUrl,
      bookingProviderConfidence: Math.max(
        incomingWithBooking.bookingProviderConfidence ?? 0,
        existingRecord.bookingProviderConfidence ?? 0,
      ) || undefined,
      bookingProviderEvidence: mergeStrings(
        existingRecord.bookingProviderEvidence ?? [],
        incomingWithBooking.bookingProviderEvidence ?? [],
        12,
      ),
      bookingProviderSource:
        incomingWithBooking.bookingProviderSource ?? existingRecord.bookingProviderSource,
      ggResolverStatus:
        incomingWithBooking.ggResolverStatus ?? existingRecord.ggResolverStatus,
      ggCheckedUrls:
        (incomingWithBooking.ggCheckedUrls?.length ?? 0) > 0
          ? incomingWithBooking.ggCheckedUrls
          : existingRecord.ggCheckedUrls,
      ggCandidateUrls:
        (incomingWithBooking.ggCandidateUrls?.length ?? 0) > 0
          ? incomingWithBooking.ggCandidateUrls
          : existingRecord.ggCandidateUrls,
      ggValidatedUrl:
        incomingWithBooking.ggValidatedUrl ?? existingRecord.ggValidatedUrl,
      ggValidationStatus:
        incomingWithBooking.ggValidationStatus ?? existingRecord.ggValidationStatus,
      ggResolverReason:
        incomingWithBooking.ggResolverReason ?? existingRecord.ggResolverReason,
      providerResolverReason:
        incomingWithBooking.providerResolverReason ?? existingRecord.providerResolverReason,
      providerDiscoveryDebug:
        incomingWithBooking.providerDiscoveryDebug ?? existingRecord.providerDiscoveryDebug,
      linkInBioUrl: incomingWithBooking.linkInBioUrl ?? existingRecord.linkInBioUrl,
      linkInBioPageFetched:
        incomingWithBooking.linkInBioPageFetched ?? existingRecord.linkInBioPageFetched,
      linkTrailUrlsScanned: mergeStrings(
        existingRecord.linkTrailUrlsScanned ?? [],
        incomingWithBooking.linkTrailUrlsScanned ?? [],
        50,
      ),
      // ── Human-set fields: NEVER overwrite ──────────────────────────────────
      validationStatus: effectiveValidationStatus,
      archiveReason:    existingRecord.archiveReason ?? null,
      status:           existingRecord.status,
      notes:            existingRecord.notes,
    }) as ProspectRecord;

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
        "business_category" = ${merged.businessCategory ?? null},
        "business_subcategory" = ${merged.businessSubcategory ?? null},
        "relationship_opportunity_type" = ${merged.relationshipOpportunityType ?? null},
        "relationship_score" = ${merged.relationshipScore ?? null},
        "audience_score" = ${merged.audienceScore ?? null},
        "operational_data_score" = ${merged.operationalDataScore ?? null},
        "community_score" = ${merged.communityScore ?? null},
        "overall_opportunity_score" = ${merged.overallOpportunityScore ?? null},
        "offer_fit_tags" = ${JSON.stringify(merged.offerFitTags ?? [])}::jsonb,
        "platform_signals" = ${JSON.stringify(merged.platformSignals ?? [])}::jsonb,
        "category_confidence" = ${merged.categoryConfidence ?? null},
        "classification_notes" = ${JSON.stringify(merged.classificationNotes ?? [])}::jsonb,
        "classification_locked" = ${merged.classificationLocked ?? false},
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
        "confOverall"      = ${merged.confidence.overall},
        "booking_provider" = ${merged.bookingProvider ?? null},
        "booking_provider_label" = ${merged.bookingProviderLabel ?? null},
        "booking_url" = ${merged.bookingUrl ?? null},
        "booking_provider_confidence" = ${merged.bookingProviderConfidence ?? null},
        "booking_provider_evidence" = ${JSON.stringify(merged.bookingProviderEvidence ?? [])}::jsonb,
        "booking_provider_source" = ${merged.bookingProviderSource ?? null},
        "gg_resolver_status" = ${merged.ggResolverStatus ?? null},
        "gg_checked_urls" = ${JSON.stringify(merged.ggCheckedUrls ?? [])}::jsonb,
        "gg_candidate_urls" = ${JSON.stringify(merged.ggCandidateUrls ?? [])}::jsonb,
        "gg_validated_url" = ${merged.ggValidatedUrl ?? null},
        "gg_validation_status" = ${merged.ggValidationStatus ?? null},
        "gg_resolver_reason" = ${merged.ggResolverReason ?? null},
        "provider_resolver_reason" = ${merged.providerResolverReason ?? null},
        "provider_discovery_debug" = ${JSON.stringify(merged.providerDiscoveryDebug ?? null)}::jsonb
      WHERE id = ${existing.id}
    `;

    return merged;
  }

  // ── New record ────────────────────────────────────────────────────────────────
  const newRecord: ProspectRecord = applyBookingDetection({
    ...incomingWithBooking,
    ...buildClassification(incomingWithBooking),
    prospectId:     generateProspectId(incomingWithBooking.identity.handle),
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
  }) as ProspectRecord;

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
      "business_category", "business_subcategory", "relationship_opportunity_type",
      "relationship_score", "audience_score", "operational_data_score", "community_score",
      "overall_opportunity_score", "offer_fit_tags", "platform_signals", "category_confidence",
      "classification_notes", "classification_locked",
      "booking_provider", "booking_provider_label", "booking_url",
      "booking_provider_confidence", "booking_provider_evidence", "booking_provider_source",
      "gg_resolver_status", "gg_checked_urls", "gg_candidate_urls", "gg_validated_url",
      "gg_validation_status", "gg_resolver_reason",
      "provider_resolver_reason", "provider_discovery_debug",
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
      ${newRecord.businessCategory ?? null},
      ${newRecord.businessSubcategory ?? null},
      ${newRecord.relationshipOpportunityType ?? null},
      ${newRecord.relationshipScore ?? null},
      ${newRecord.audienceScore ?? null},
      ${newRecord.operationalDataScore ?? null},
      ${newRecord.communityScore ?? null},
      ${newRecord.overallOpportunityScore ?? null},
      ${JSON.stringify(newRecord.offerFitTags ?? [])}::jsonb,
      ${JSON.stringify(newRecord.platformSignals ?? [])}::jsonb,
      ${newRecord.categoryConfidence ?? null},
      ${JSON.stringify(newRecord.classificationNotes ?? [])}::jsonb,
      ${newRecord.classificationLocked ?? false},
      ${newRecord.bookingProvider ?? null},
      ${newRecord.bookingProviderLabel ?? null},
      ${newRecord.bookingUrl ?? null},
      ${newRecord.bookingProviderConfidence ?? null},
      ${JSON.stringify(newRecord.bookingProviderEvidence ?? [])}::jsonb,
      ${newRecord.bookingProviderSource ?? null},
      ${newRecord.ggResolverStatus ?? null},
      ${JSON.stringify(newRecord.ggCheckedUrls ?? [])}::jsonb,
      ${JSON.stringify(newRecord.ggCandidateUrls ?? [])}::jsonb,
      ${newRecord.ggValidatedUrl ?? null},
      ${newRecord.ggValidationStatus ?? null},
      ${newRecord.ggResolverReason ?? null},
      ${newRecord.providerResolverReason ?? null},
      ${JSON.stringify(newRecord.providerDiscoveryDebug ?? null)}::jsonb,
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

export async function updateProspectClassificationPostgres(
  prospectId: string,
  patch: ClassificationFields
): Promise<ProspectRecord | null> {
  const rows = await prisma.$queryRaw<DbProspectRow[]>`
    SELECT * FROM studio_prospects WHERE id = ${prospectId} LIMIT 1
  `;
  if (rows.length === 0) return null;

  await prisma.$executeRaw`
    UPDATE studio_prospects SET
      "business_category" = ${patch.businessCategory ?? null},
      "business_subcategory" = ${patch.businessSubcategory ?? null},
      "relationship_opportunity_type" = ${patch.relationshipOpportunityType ?? null},
      "relationship_score" = ${patch.relationshipScore ?? null},
      "audience_score" = ${patch.audienceScore ?? null},
      "operational_data_score" = ${patch.operationalDataScore ?? null},
      "community_score" = ${patch.communityScore ?? null},
      "overall_opportunity_score" = ${patch.overallOpportunityScore ?? null},
      "offer_fit_tags" = ${JSON.stringify(patch.offerFitTags ?? [])}::jsonb,
      "platform_signals" = ${JSON.stringify(patch.platformSignals ?? [])}::jsonb,
      "category_confidence" = ${patch.categoryConfidence ?? null},
      "classification_notes" = ${JSON.stringify(patch.classificationNotes ?? [])}::jsonb,
      "classification_locked" = ${patch.classificationLocked ?? false},
      "updatedAt" = NOW()
    WHERE id = ${prospectId}
  `;

  const updated = await prisma.$queryRaw<DbProspectRow[]>`
    SELECT * FROM studio_prospects WHERE id = ${prospectId} LIMIT 1
  `;
  return updated[0] ? rowToRecord(updated[0]) : null;
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
  return rows.map(rowToRecord).map((r) => enrichProspectBookingIfMissing(r));
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

  if (filter.businessCategory)
    conditions.push(Prisma.sql`"business_category" = ${filter.businessCategory}`);

  if (filter.relationshipOpportunityType)
    conditions.push(Prisma.sql`"relationship_opportunity_type" = ${filter.relationshipOpportunityType}`);

  if (filter.minOpportunityScore !== undefined)
    conditions.push(Prisma.sql`COALESCE("overall_opportunity_score", 0) >= ${filter.minOpportunityScore}`);

  if (filter.platformSignal)
    conditions.push(Prisma.sql`"platform_signals"::jsonb ? ${filter.platformSignal}`);

  if (filter.offerFitTag)
    conditions.push(Prisma.sql`"offer_fit_tags"::jsonb ? ${filter.offerFitTag}`);

  const where =
    conditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
      : Prisma.sql``;

  const rows = await prisma.$queryRaw<DbProspectRow[]>`
    SELECT * FROM studio_prospects ${where} ORDER BY "createdAt" DESC
  `;
  let records = rows.map(rowToRecord).map((r) => enrichProspectBookingIfMissing(r));
  if (filter.bookingProvider) {
    records = records.filter((p) => {
      const bp = p.bookingProvider ?? "unknown";
      if (filter.bookingProvider === "unknown") return !p.bookingProvider || bp === "unknown";
      return bp === filter.bookingProvider;
    });
  }
  if (filter.bookingProviderSource) {
    const want = filter.bookingProviderSource === "link_trail" ? "link_in_bio" : filter.bookingProviderSource;
    records = records.filter((p) => {
      const src = p.bookingProviderSource === "link_trail" ? "link_in_bio" : p.bookingProviderSource;
      return src === want;
    });
  }
  if (filter.importCandidateOnly) {
    records = records.filter((p) => isSalonImportCandidate(p));
  }
  if (filter.confidenceBucket) {
    records = records.filter((p) => {
      const c = p.bookingProviderConfidence ?? 0;
      if (filter.confidenceBucket === "high") return c >= 75;
      if (filter.confidenceBucket === "medium") return c >= 50 && c < 75;
      return c < 50;
    });
  }
  return records;
}

// ─── Count ────────────────────────────────────────────────────────────────────

export async function countProspectsPostgres(): Promise<number> {
  const result = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM studio_prospects
  `;
  return Number(result[0]?.count ?? 0);
}

// ─── Clear all (testing / fresh-slate) ───────────────────────────────────────

/** Deletes every row from studio_prospects. Returns the number of rows removed.
 *  DESTRUCTIVE — admin only. */
export async function clearAllProspectsPostgres(): Promise<number> {
  const count = await countProspectsPostgres();
  await prisma.$executeRaw`DELETE FROM studio_prospects`;
  return count;
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
