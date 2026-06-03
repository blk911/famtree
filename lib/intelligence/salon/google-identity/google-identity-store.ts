// lib/intelligence/salon/google-identity/google-identity-store.ts
// Separate cache — never mutates prospect records.

import { promises as fs } from "fs";
import path from "path";
import type { GoogleIdentityRecord } from "./types";

const CACHE_PATH = path.join(
  process.cwd(),
  "runtime-data",
  "intelligence",
  "salon",
  "google-identity-cache.json",
);

let _records: GoogleIdentityRecord[] | null = null;
let _computedAt: string | null = null;

export function getGoogleIdentityCache(): {
  records: GoogleIdentityRecord[] | null;
  computedAt: string | null;
} {
  return { records: _records, computedAt: _computedAt };
}

export function setGoogleIdentityCache(records: GoogleIdentityRecord[]): void {
  _records = records;
  _computedAt = new Date().toISOString();
}

export function clearGoogleIdentityCache(): void {
  _records = null;
  _computedAt = null;
}

export async function persistGoogleIdentityCache(
  records: GoogleIdentityRecord[],
): Promise<void> {
  setGoogleIdentityCache(records);
  try {
    await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
    await fs.writeFile(
      CACHE_PATH,
      JSON.stringify({ computedAt: _computedAt, records }, null, 2),
      "utf8",
    );
  } catch {
    // non-fatal
  }
}

export async function loadGoogleIdentityCacheFromDisk(): Promise<
  GoogleIdentityRecord[] | null
> {
  try {
    const raw = await fs.readFile(CACHE_PATH, "utf8");
    const parsed = JSON.parse(raw) as {
      computedAt?: string;
      records?: GoogleIdentityRecord[];
    };
    if (Array.isArray(parsed.records) && parsed.records.length > 0) {
      _records = parsed.records;
      _computedAt = parsed.computedAt ?? new Date().toISOString();
      return parsed.records;
    }
  } catch {
    // no cache
  }
  return null;
}

export function getGoogleIdentityForProspect(
  prospectId: string,
): GoogleIdentityRecord | null {
  const rec = _records?.find((r) => r.prospectId === prospectId);
  return rec ?? null;
}
