// lib/transpo/evidence-override-store.ts

import { mkdir, readFile, writeFile } from "fs/promises";
import type { EvidenceOverride, EvidenceOverridesFile } from "./evidence-override-types";
import { EVIDENCE_OVERRIDES_PATH, TRANSPO_DATA_DIR } from "./paths";

export function makeOverrideId(countyKey: string, evidenceKey: string): string {
  return `transpo:${countyKey}:${evidenceKey}`;
}

async function ensureStore(): Promise<EvidenceOverridesFile> {
  try {
    const raw = await readFile(EVIDENCE_OVERRIDES_PATH, "utf8");
    return JSON.parse(raw) as EvidenceOverridesFile;
  } catch {
    const empty: EvidenceOverridesFile = { overrides: [] };
    await mkdir(TRANSPO_DATA_DIR, { recursive: true });
    await writeFile(EVIDENCE_OVERRIDES_PATH, `${JSON.stringify(empty, null, 2)}\n`, "utf8");
    return empty;
  }
}

export async function readEvidenceOverrides(): Promise<EvidenceOverridesFile> {
  return ensureStore();
}

export async function getOverridesByCountyKey(countyKey: string): Promise<EvidenceOverride[]> {
  const store = await readEvidenceOverrides();
  return store.overrides.filter((o) => o.countyKey === countyKey);
}

export async function upsertEvidenceOverride(
  input: Omit<EvidenceOverride, "overrideId" | "createdAt" | "updatedAt"> & {
    overrideId?: string;
    createdAt?: string;
  },
): Promise<EvidenceOverride> {
  const store = await readEvidenceOverrides();
  const overrideId = input.overrideId ?? makeOverrideId(input.countyKey, input.evidenceKey);
  const now = new Date().toISOString();
  const existing = store.overrides.find((o) => o.overrideId === overrideId);
  const record: EvidenceOverride = {
    overrideId,
    countyKey: input.countyKey,
    county: input.county,
    state: input.state,
    evidenceKey: input.evidenceKey,
    status: input.status,
    value: input.value,
    source: input.source,
    sourceUrl: input.sourceUrl,
    notes: input.notes,
    createdFromTaskId: input.createdFromTaskId ?? existing?.createdFromTaskId,
    createdAt: existing?.createdAt ?? input.createdAt ?? now,
    updatedAt: now,
  };

  const next = store.overrides.filter((o) => o.overrideId !== overrideId);
  next.push(record);
  next.sort((a, b) => {
    if (a.countyKey !== b.countyKey) return a.countyKey.localeCompare(b.countyKey);
    return a.evidenceKey.localeCompare(b.evidenceKey);
  });

  await writeFile(
    EVIDENCE_OVERRIDES_PATH,
    `${JSON.stringify({ overrides: next }, null, 2)}\n`,
    "utf8",
  );
  return record;
}

export async function deleteEvidenceOverride(
  criteria: { overrideId?: string; countyKey?: string; evidenceKey?: string },
): Promise<boolean> {
  const store = await readEvidenceOverrides();
  const before = store.overrides.length;

  const next = store.overrides.filter((o) => {
    if (criteria.overrideId) return o.overrideId !== criteria.overrideId;
    if (criteria.countyKey && criteria.evidenceKey) {
      return !(o.countyKey === criteria.countyKey && o.evidenceKey === criteria.evidenceKey);
    }
    return true;
  });

  if (next.length === before) return false;

  await writeFile(
    EVIDENCE_OVERRIDES_PATH,
    `${JSON.stringify({ overrides: next }, null, 2)}\n`,
    "utf8",
  );
  return true;
}
