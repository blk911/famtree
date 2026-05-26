// lib/studios/prospects/store.ts
// Flat JSON file storage for creator prospect records.
// Single file: runtime-data/studios/prospects/prospects.json
// Vercel: /tmp/studios-prospects/prospects.json (ephemeral — future: swap for Blob)

import { promises as fs } from "fs";
import path from "path";
import type { ProspectRecord, ProspectStatus, MatchedUrl } from "./types";
import type { ValidationStatus } from "@/lib/studios/creator-lab/hashtag-harvest/education-config";

const DATA_DIR = process.env.VERCEL
  ? "/tmp/studios-prospects"
  : path.resolve(process.cwd(), "runtime-data", "studios", "prospects");

const PROSPECTS_FILE = path.join(DATA_DIR, "prospects.json");

/** Returns the absolute path to the prospects JSON file — for diagnostics. */
export function getProspectStorePath(): string {
  return PROSPECTS_FILE;
}

/** Returns the number of records currently in the store without modifying anything. */
export async function countProspects(): Promise<number> {
  const records = await loadAllProspects();
  return records.length;
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

// ─── Normalize ────────────────────────────────────────────────────────────────

function normalizeHandle(handle: string): string {
  return handle.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function generateProspectId(handle: string): string {
  const clean = handle.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 40);
  return `prospect-${clean}`;
}

// ─── Low-level IO ─────────────────────────────────────────────────────────────

export async function loadAllProspects(): Promise<ProspectRecord[]> {
  await ensureDir();
  try {
    const raw = await fs.readFile(PROSPECTS_FILE, "utf-8");
    return JSON.parse(raw) as ProspectRecord[];
  } catch {
    return [];
  }
}

async function writeAllProspects(records: ProspectRecord[]): Promise<void> {
  await ensureDir();
  await fs.writeFile(PROSPECTS_FILE, JSON.stringify(records, null, 2), "utf-8");
}

// ─── Merge helpers ────────────────────────────────────────────────────────────

function mergeMatchedUrls(existing: MatchedUrl[], incoming: MatchedUrl[]): MatchedUrl[] {
  const map = new Map<string, MatchedUrl>();
  for (const u of existing) map.set(u.url, u);
  for (const u of incoming) {
    const ex = map.get(u.url);
    if (!ex || u.confidence > ex.confidence) map.set(u.url, u);
  }
  return Array.from(map.values()).sort((a, b) => b.confidence - a.confidence);
}

function mergeStrings(a: string[], b: string[], cap = 20): string[] {
  return Array.from(new Set([...a, ...b])).filter(Boolean).slice(0, cap);
}

// ─── Human-set field guard ────────────────────────────────────────────────────

/**
 * Returns true if the validationStatus was set by a human (not the system default).
 * System sets "new" and "needs_review" automatically. Anything else is human.
 */
function isHumanSetValidationStatus(vs: ValidationStatus | undefined): boolean {
  if (!vs) return false;
  return vs !== "new" && vs !== "needs_review";
}

// ─── UpsertInput ──────────────────────────────────────────────────────────────

export type UpsertInput = Omit<ProspectRecord,
  "prospectId" | "createdAt" | "updatedAt" | "status" | "notes" | "validationStatus" | "archiveReason"
> & {
  /** System-suggested validation status — NOT applied if human has overridden */
  suggestedValidationStatus?: ValidationStatus;
};

// ─── Upsert (dedup by handle or bestMatch URL) ────────────────────────────────

export async function upsertProspect(incoming: UpsertInput): Promise<ProspectRecord> {
  const records = await loadAllProspects();
  const now = new Date().toISOString();

  const incomingKey = normalizeHandle(incoming.identity.handle);
  const incomingUrl = incoming.bestMatch?.url ?? null;

  // Find existing by normalized handle OR bestMatch URL
  const existingIdx = records.findIndex((r) => {
    const sameHandle = incomingKey.length > 2 &&
      normalizeHandle(r.identity.handle) === incomingKey;
    const sameUrl = incomingUrl &&
      (r.bestMatch?.url === incomingUrl ||
       r.allMatchedUrls.some((u) => u.url === incomingUrl));
    return sameHandle || sameUrl;
  });

  if (existingIdx >= 0) {
    const existing = records[existingIdx];

    // Determine effective validation status:
    // NEVER downgrade a human-set status on re-run
    const effectiveValidationStatus: ValidationStatus =
      isHumanSetValidationStatus(existing.validationStatus)
        ? existing.validationStatus
        : (incoming.suggestedValidationStatus ?? existing.validationStatus ?? "new");

    // Merge sourceHashtags — accumulate across runs
    const mergedHashtags = mergeStrings(
      existing.sourceHashtags ?? [],
      incoming.sourceHashtags ?? []
    );

    const merged: ProspectRecord = {
      ...existing,
      updatedAt: now,
      // Update identity — keep better data
      identity: {
        name: incoming.identity.name || existing.identity.name,
        handle: existing.identity.handle,
        categoryGuess: incoming.identity.categoryGuess ?? existing.identity.categoryGuess,
        locationGuess: incoming.identity.locationGuess ?? existing.identity.locationGuess,
      },
      // Education classification — upgrade if incoming is more specific
      educationType: (incoming.educationType && incoming.educationType !== "unknown")
        ? incoming.educationType
        : existing.educationType ?? null,
      audienceType: (incoming.audienceType && incoming.audienceType !== "unknown")
        ? incoming.audienceType
        : existing.audienceType ?? null,
      sourceTopic: incoming.sourceTopic ?? existing.sourceTopic ?? null,
      // Source provenance — enrich, don't overwrite
      vertical:       incoming.vertical       || existing.vertical       || "education",
      sourcePlatform: incoming.sourcePlatform || existing.sourcePlatform || "instagram",
      sourceTool:     incoming.sourceTool     || existing.sourceTool     || "hashtag_harvest",
      sourceHashtag:  existing.sourceHashtag  ?? incoming.sourceHashtag  ?? null,
      sourceHashtags: mergedHashtags,
      sourcePath:     existing.sourcePath     || incoming.sourcePath     || "",
      runId:          incoming.runId          ?? existing.runId          ?? null,
      harvestDate:    existing.harvestDate    ?? incoming.harvestDate    ?? null,
      // Upgrade bestMatch only if incoming has higher confidence
      bestMatch:
        !existing.bestMatch ||
        (incoming.bestMatch && incoming.bestMatch.confidence > existing.bestMatch.confidence)
          ? incoming.bestMatch
          : existing.bestMatch,
      platforms: mergeStrings(existing.platforms ?? [], incoming.platforms ?? []),
      services:  mergeStrings(existing.services, incoming.services),
      allMatchedUrls: mergeMatchedUrls(existing.allMatchedUrls, incoming.allMatchedUrls),
      evidence:  mergeStrings(existing.evidence, incoming.evidence, 20),
      // Upgrade confidence if overall is better
      confidence:
        incoming.confidence.overall > existing.confidence.overall
          ? incoming.confidence
          : existing.confidence,
      // ── ALWAYS preserve human-set fields ───────────────────────────────────
      validationStatus: effectiveValidationStatus,
      archiveReason: existing.archiveReason ?? null,
      status: existing.status,
      notes:  existing.notes,
    };

    records[existingIdx] = merged;
    await writeAllProspects(records);
    return merged;
  }

  // ── New record ────────────────────────────────────────────────────────────────
  const newRecord: ProspectRecord = {
    ...incoming,
    prospectId: generateProspectId(incoming.identity.handle),
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

// ─── Status / notes / validationStatus update (admin edit) ───────────────────

export async function updateProspect(
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

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listProspects(): Promise<ProspectRecord[]> {
  const records = await loadAllProspects();
  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ─── Filtered list (for API query params) ────────────────────────────────────

export interface ProspectFilter {
  vertical?: string;
  educationType?: string;
  audienceType?: string;
  sourceHashtag?: string;
  validationStatus?: string;
  platform?: string;
  location?: string;      // substring match on identity.locationGuess
  minConfidence?: number;
}

export async function filterProspects(filter: ProspectFilter): Promise<ProspectRecord[]> {
  const records = await loadAllProspects();

  const filtered = records.filter((p) => {
    if (filter.vertical       && p.vertical       !== filter.vertical)                          return false;
    if (filter.educationType  && p.educationType  !== filter.educationType)                     return false;
    if (filter.audienceType   && p.audienceType   !== filter.audienceType)                      return false;
    if (filter.sourceHashtag  && p.sourceHashtag  !== filter.sourceHashtag)                    return false;
    if (filter.validationStatus && (p.validationStatus ?? "new") !== filter.validationStatus)   return false;
    if (filter.platform       && p.bestMatch?.platform !== filter.platform)                     return false;
    if (filter.location) {
      const loc = (p.identity.locationGuess ?? "").toLowerCase();
      if (!loc.includes(filter.location.toLowerCase()))                                         return false;
    }
    if (filter.minConfidence  !== undefined && p.confidence.overall < filter.minConfidence)     return false;
    return true;
  });

  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
