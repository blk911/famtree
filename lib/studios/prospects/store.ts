// lib/studios/prospects/store.ts
// Flat JSON file storage for creator prospect records.
// Single file: runtime-data/studios/prospects/prospects.json
// Vercel: /tmp/studios-prospects/prospects.json (ephemeral — future: swap for Blob)

import { promises as fs } from "fs";
import path from "path";
import type { ProspectRecord, MatchedUrl } from "./types";

const DATA_DIR = process.env.VERCEL
  ? "/tmp/studios-prospects"
  : path.resolve(process.cwd(), "runtime-data", "studios", "prospects");

const PROSPECTS_FILE = path.join(DATA_DIR, "prospects.json");

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

// ─── Upsert (dedup by handle or bestMatch URL) ────────────────────────────────

export type UpsertInput = Omit<ProspectRecord, "prospectId" | "createdAt" | "updatedAt" | "status" | "notes">;

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
      // Upgrade bestMatch only if incoming has higher confidence
      bestMatch:
        !existing.bestMatch ||
        (incoming.bestMatch && incoming.bestMatch.confidence > existing.bestMatch.confidence)
          ? incoming.bestMatch
          : existing.bestMatch,
      services: mergeStrings(existing.services, incoming.services),
      allMatchedUrls: mergeMatchedUrls(existing.allMatchedUrls, incoming.allMatchedUrls),
      evidence: mergeStrings(existing.evidence, incoming.evidence),
      // Upgrade confidence breakdown if overall is better
      confidence:
        incoming.confidence.overall > existing.confidence.overall
          ? incoming.confidence
          : existing.confidence,
      // ALWAYS preserve human-set fields
      status: existing.status,
      notes: existing.notes,
    };

    records[existingIdx] = merged;
    await writeAllProspects(records);
    return merged;
  }

  // New record
  const newRecord: ProspectRecord = {
    ...incoming,
    prospectId: generateProspectId(incoming.identity.handle),
    createdAt: now,
    updatedAt: now,
    status: "new",
    notes: "",
  };
  records.push(newRecord);
  await writeAllProspects(records);
  return newRecord;
}

// ─── Status / notes update (admin edit) ──────────────────────────────────────

export async function updateProspect(
  prospectId: string,
  patch: Partial<Pick<ProspectRecord, "status" | "notes">>
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
  // Default: newest first
  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
