// lib/studios/prospects/store-json.ts
// Flat JSON file implementation of the prospect store.
// Used by store.ts when PROSPECT_STORE_BACKEND=json (or auto with no DB).
// This is the original store.ts logic, extracted for the adapter pattern.

import { promises as fs } from "fs";
import path from "path";
import type { ProspectRecord, ProspectStatus, MatchedUrl, ProspectEvidence, ProspectBestMatch } from "./types";
import type { ValidationStatus } from "@/lib/studios/creator-lab/hashtag-harvest/education-config";
import { classifyRelationshipOpportunity } from "./opportunity-classifier";

const DATA_DIR = process.env.VERCEL
  ? "/tmp/studios-prospects"
  : path.resolve(process.cwd(), "runtime-data", "studios", "prospects");

const PROSPECTS_FILE = path.join(DATA_DIR, "prospects.json");

/** Returns the absolute path to the JSON prospects file — for diagnostics. */
export function getJsonStorePath(): string {
  return PROSPECTS_FILE;
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

// ─── Normalize ────────────────────────────────────────────────────────────────

export function normalizeHandle(handle: string): string {
  return handle.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function generateProspectId(handle: string): string {
  const clean = handle.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 40);
  return `prospect-${clean}`;
}

export function generateIdentityFingerprint(input: {
  handle?: string | null;
  name?: string | null;
  bestMatchUrl?: string | null;
  sourcePlatform?: string | null;
}): string {
  const handle = normalizeHandle(input.handle ?? "");
  if (handle.length > 2) return `handle:${handle}`;

  const url = (input.bestMatchUrl ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (url) return `url:${url}`;

  const platform = (input.sourcePlatform ?? "unknown").toLowerCase().replace(/[^a-z0-9]/g, "");
  const name = (input.name ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return `name:${platform}:${name || "unknown"}`;
}

function withGeneratedFields(record: ProspectRecord): ProspectRecord {
  return {
    ...record,
    identityFingerprint: record.identityFingerprint ?? generateIdentityFingerprint({
      handle: record.identity.handle,
      name: record.identity.name,
      bestMatchUrl: record.bestMatch?.url,
      sourcePlatform: record.sourcePlatform,
    }),
  };
}

type ClassificationFields = Pick<ProspectRecord,
  "businessCategory" | "businessSubcategory" | "relationshipOpportunityType" |
  "relationshipScore" | "audienceScore" | "operationalDataScore" | "communityScore" |
  "overallOpportunityScore" | "offerFitTags" | "platformSignals" | "categoryConfidence" |
  "classificationNotes" | "classificationLocked"
>;

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

// ─── Low-level IO ─────────────────────────────────────────────────────────────

export async function loadAllProspects(): Promise<ProspectRecord[]> {
  await ensureDir();
  try {
    const raw = await fs.readFile(PROSPECTS_FILE, "utf-8");
    return (JSON.parse(raw) as ProspectRecord[]).map(withGeneratedFields);
  } catch {
    return [];
  }
}

export async function writeAllProspects(records: ProspectRecord[]): Promise<void> {
  await ensureDir();
  await fs.writeFile(PROSPECTS_FILE, JSON.stringify(records, null, 2), "utf-8");
}

// ─── Merge helpers ────────────────────────────────────────────────────────────

export function mergeMatchedUrls(existing: MatchedUrl[], incoming: MatchedUrl[]): MatchedUrl[] {
  const map = new Map<string, MatchedUrl>();
  for (const u of existing) map.set(u.url, u);
  for (const u of incoming) {
    const ex = map.get(u.url);
    if (!ex || u.confidence > ex.confidence) map.set(u.url, u);
  }
  return Array.from(map.values()).sort((a, b) => b.confidence - a.confidence);
}

export function mergeStrings(a: string[], b: string[], cap = 20): string[] {
  return Array.from(new Set([...a, ...b])).filter(Boolean).slice(0, cap);
}

export function mergeEvidence(a: ProspectEvidence[], b: ProspectEvidence[], cap = 20): ProspectEvidence[] {
  const map = new Map<string, ProspectEvidence>();
  for (const item of [...a, ...b].filter(Boolean)) {
    const key = typeof item === "string"
      ? `string:${item}`
      : `object:${item.type}:${item.url}:${item.label}`;
    if (!map.has(key)) map.set(key, item);
  }
  return Array.from(map.values()).slice(0, cap);
}

export function mergeRejectedUrls(
  a: Array<{ url: string; platform: string; reason: string }>,
  b: Array<{ url: string; platform: string; reason: string }>,
  cap = 100,
): Array<{ url: string; platform: string; reason: string }> {
  const map = new Map<string, { url: string; platform: string; reason: string }>();
  for (const item of [...a, ...b]) {
    if (!map.has(item.url)) map.set(item.url, item);
  }
  return Array.from(map.values()).slice(0, cap);
}

// ─── Human-set field guard ────────────────────────────────────────────────────

export function isHumanSetValidationStatus(vs: ValidationStatus | undefined): boolean {
  if (!vs) return false;
  return vs !== "new" && vs !== "needs_review";
}

// ─── UpsertInput ──────────────────────────────────────────────────────────────

export type UpsertInput = Omit<ProspectRecord,
  "prospectId" | "identityFingerprint" | "createdAt" | "updatedAt" | "status" | "notes" | "validationStatus" | "archiveReason"
> & {
  suggestedValidationStatus?: ValidationStatus;
};

// ─── ProspectFilter ───────────────────────────────────────────────────────────

export interface ProspectFilter {
  vertical?: string;
  educationType?: string;
  audienceType?: string;
  sourceHashtag?: string;
  validationStatus?: string;
  platform?: string;
  location?: string;       // substring match on identity.locationGuess
  minConfidence?: number;
  businessCategory?: string;
  relationshipOpportunityType?: string;
  minOpportunityScore?: number;
  platformSignal?: string;
  offerFitTag?: string;
  sourceType?: string;     // e.g. "education_directory_import"
  sourcePlatform?: string; // e.g. "directory_import"
  sourceTool?: string;     // e.g. "education_directory_import"
  runId?: string;
}

// ─── Upsert ───────────────────────────────────────────────────────────────────

export async function upsertProspectJson(incoming: UpsertInput): Promise<ProspectRecord> {
  const records = await loadAllProspects();
  const now = new Date().toISOString();

  const incomingKey = normalizeHandle(incoming.identity.handle);
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

  const existingIdx = records.findIndex((r) => {
    const sameFingerprint =
      (r.identityFingerprint ?? generateIdentityFingerprint({
        handle: r.identity.handle,
        name: r.identity.name,
        bestMatchUrl: r.bestMatch?.url,
        sourcePlatform: r.sourcePlatform,
      })) === incomingFingerprint;
    const sameHandle = incomingKey.length > 2 &&
      normalizeHandle(r.identity.handle) === incomingKey;
    const sameUrl = incomingUrls.length > 0 && incomingUrls.some((url) =>
      r.bestMatch?.url === url ||
      r.allMatchedUrls.some((u) => u.url === url)
    );
    return sameFingerprint || sameHandle || sameUrl;
  });

  if (existingIdx >= 0) {
    const existing = records[existingIdx];

    const effectiveValidationStatus: ValidationStatus =
      isHumanSetValidationStatus(existing.validationStatus)
        ? existing.validationStatus
        : (incoming.suggestedValidationStatus ?? existing.validationStatus ?? "new");

    const mergedHashtags = mergeStrings(existing.sourceHashtags ?? [], incoming.sourceHashtags ?? []);

    const merged: ProspectRecord = {
      ...existing,
      ...mergeClassification(existing, incoming),
      identityFingerprint: existing.identityFingerprint ?? incomingFingerprint,
      updatedAt: now,
      identity: {
        name: incoming.identity.name || existing.identity.name,
        handle: existing.identity.handle,
        categoryGuess: incoming.identity.categoryGuess ?? existing.identity.categoryGuess,
        locationGuess: incoming.identity.locationGuess ?? existing.identity.locationGuess,
      },
      educationType: (incoming.educationType && incoming.educationType !== "unknown")
        ? incoming.educationType
        : existing.educationType ?? null,
      audienceType: (incoming.audienceType && incoming.audienceType !== "unknown")
        ? incoming.audienceType
        : existing.audienceType ?? null,
      sourceTopic: incoming.sourceTopic ?? existing.sourceTopic ?? null,
      vertical:       incoming.vertical       || existing.vertical       || "education",
      sourcePlatform: incoming.sourcePlatform || existing.sourcePlatform || "instagram",
      sourceTool:     incoming.sourceTool     || existing.sourceTool     || "hashtag_harvest",
      sourceHashtag:  existing.sourceHashtag  ?? incoming.sourceHashtag  ?? null,
      sourceHashtags: mergedHashtags,
      sourcePath:     existing.sourcePath     || incoming.sourcePath     || "",
      runId:          incoming.runId          ?? existing.runId          ?? null,
      harvestDate:    existing.harvestDate    ?? incoming.harvestDate    ?? null,
      bestMatch:
        !existing.bestMatch ||
        (incoming.bestMatch && incoming.bestMatch.confidence > existing.bestMatch.confidence)
          ? incoming.bestMatch
          : existing.bestMatch,
      platforms: mergeStrings(existing.platforms ?? [], incoming.platforms ?? []),
      services:  mergeStrings(existing.services, incoming.services),
      allMatchedUrls: mergeMatchedUrls(existing.allMatchedUrls, incoming.allMatchedUrls),
      evidence:  mergeEvidence(existing.evidence, incoming.evidence, 20),
      candidateUrlsTested: mergeStrings(existing.candidateUrlsTested ?? [], incoming.candidateUrlsTested ?? [], 200),
      rejectedCandidateUrls: mergeRejectedUrls(existing.rejectedCandidateUrls ?? [], incoming.rejectedCandidateUrls ?? []),
      confidence:
        incoming.confidence.overall > existing.confidence.overall
          ? incoming.confidence
          : existing.confidence,
      // ALWAYS preserve human-set fields
      validationStatus: effectiveValidationStatus,
      archiveReason: existing.archiveReason ?? null,
      status: existing.status,
      notes:  existing.notes,
    };

    records[existingIdx] = merged;
    await writeAllProspects(records);
    return merged;
  }

  const newRecord: ProspectRecord = {
    ...incoming,
    ...buildClassification(incoming),
    prospectId: generateProspectId(incoming.identity.handle),
    identityFingerprint: incomingFingerprint,
    createdAt: now,
    updatedAt: now,
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
    archiveReason: null,
    status: "new",
    notes:  "",
  };

  records.push(newRecord);
  await writeAllProspects(records);
  return newRecord;
}

// ─── Update (admin patch) ─────────────────────────────────────────────────────

export async function updateProspectJson(
  prospectId: string,
  patch: Partial<Pick<ProspectRecord, "status" | "notes" | "validationStatus" | "archiveReason">>
): Promise<ProspectRecord | null> {
  const records = await loadAllProspects();
  const idx = records.findIndex((r) => r.prospectId === prospectId);
  if (idx < 0) return null;

  const updated: ProspectRecord = {
    ...records[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  records[idx] = updated;
  await writeAllProspects(records);
  return updated;
}

export async function updateProspectClassificationJson(
  prospectId: string,
  patch: ClassificationFields
): Promise<ProspectRecord | null> {
  const records = await loadAllProspects();
  const idx = records.findIndex((r) => r.prospectId === prospectId);
  if (idx < 0) return null;

  const updated: ProspectRecord = {
    ...records[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  records[idx] = updated;
  await writeAllProspects(records);
  return updated;
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listProspectsJson(): Promise<ProspectRecord[]> {
  const records = await loadAllProspects();
  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ─── Filter ───────────────────────────────────────────────────────────────────

export async function filterProspectsJson(filter: ProspectFilter): Promise<ProspectRecord[]> {
  const records = await loadAllProspects();

  const filtered = records.filter((p) => {
    if (filter.vertical        && p.vertical        !== filter.vertical)       return false;
    if (filter.educationType   && p.educationType   !== filter.educationType)  return false;
    if (filter.audienceType    && p.audienceType    !== filter.audienceType)   return false;
    if (filter.sourceHashtag   && p.sourceHashtag   !== filter.sourceHashtag) return false;
    if (filter.validationStatus && (p.validationStatus ?? "new") !== filter.validationStatus) return false;
    if (filter.platform        && p.bestMatch?.platform !== filter.platform)   return false;
    if (filter.sourceType      && p.source?.sourceType  !== filter.sourceType) return false;
    if (filter.sourcePlatform  && p.sourcePlatform  !== filter.sourcePlatform) return false;
    if (filter.sourceTool      && p.sourceTool      !== filter.sourceTool)     return false;
    if (filter.runId           && p.runId           !== filter.runId)          return false;
    if (filter.location) {
      const loc = (p.identity.locationGuess ?? "").toLowerCase();
      if (!loc.includes(filter.location.toLowerCase()))                        return false;
    }
    if (filter.minConfidence !== undefined && p.confidence.overall < filter.minConfidence) return false;
    if (filter.businessCategory && p.businessCategory !== filter.businessCategory) return false;
    if (filter.relationshipOpportunityType && p.relationshipOpportunityType !== filter.relationshipOpportunityType) return false;
    if (filter.minOpportunityScore !== undefined && (p.overallOpportunityScore ?? 0) < filter.minOpportunityScore) return false;
    if (filter.platformSignal && !(p.platformSignals ?? []).includes(filter.platformSignal)) return false;
    if (filter.offerFitTag && !(p.offerFitTags ?? []).includes(filter.offerFitTag)) return false;
    return true;
  });

  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ─── Count ────────────────────────────────────────────────────────────────────

export async function countProspectsJson(): Promise<number> {
  const records = await loadAllProspects();
  return records.length;
}

// ─── Clear all (testing / fresh-slate) ───────────────────────────────────────

/** Wipes every record from the JSON store. Returns the number of records deleted.
 *  DESTRUCTIVE — admin only. Preserves the file (writes empty array) so the
 *  path stays valid for subsequent runs. */
export async function clearAllProspectsJson(): Promise<number> {
  const records = await loadAllProspects();
  const count = records.length;
  await writeAllProspects([]);
  return count;
}
