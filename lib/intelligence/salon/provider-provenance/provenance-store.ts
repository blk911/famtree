// lib/intelligence/salon/provider-provenance/provenance-store.ts
// In-memory provenance cache (no prospect mutation). Optional JSON snapshot for dev.

import { promises as fs } from "fs";
import path from "path";
import type { ProviderProvenanceRecord } from "./types";

const CACHE_PATH = path.join(
  process.cwd(),
  "runtime-data",
  "intelligence",
  "salon",
  "provider-provenance-cache.json",
);

let _records: ProviderProvenanceRecord[] | null = null;
let _computedAt: string | null = null;

export function getProvenanceCache(): {
  records: ProviderProvenanceRecord[] | null;
  computedAt: string | null;
} {
  return { records: _records, computedAt: _computedAt };
}

export function setProvenanceCache(records: ProviderProvenanceRecord[]): void {
  _records = records;
  _computedAt = new Date().toISOString();
}

export function clearProvenanceCache(): void {
  _records = null;
  _computedAt = null;
}

export async function persistProvenanceCache(records: ProviderProvenanceRecord[]): Promise<void> {
  setProvenanceCache(records);
  try {
    await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
    await fs.writeFile(
      CACHE_PATH,
      JSON.stringify({ computedAt: _computedAt, records }, null, 2),
      "utf8",
    );
  } catch {
    // non-fatal — live compute still works
  }
}

export async function loadProvenanceCacheFromDisk(): Promise<ProviderProvenanceRecord[] | null> {
  try {
    const raw = await fs.readFile(CACHE_PATH, "utf8");
    const parsed = JSON.parse(raw) as {
      computedAt?: string;
      records?: ProviderProvenanceRecord[];
    };
    if (Array.isArray(parsed.records) && parsed.records.length > 0) {
      _records = parsed.records;
      _computedAt = parsed.computedAt ?? new Date().toISOString();
      return parsed.records;
    }
  } catch {
    // no cache file
  }
  return null;
}
