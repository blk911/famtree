// lib/intelligence/transpo/carrier-master-store.ts
// Durable Transpo carrier master store. Source-run records are promoted here to
// build a stable, de-duplicated carrier list that survives individual runs.
//
// On Vercel the deployment filesystem is read-only, so writes go to /tmp (same
// strategy as source-runs-store). Locally they persist under runtime-data/.
// Reads/writes share one path resolver. Writes are best-effort and surface a
// persist error rather than throwing on a read-only filesystem.

import { promises as fs } from "fs";
import path from "path";
import type {
  TranspoCarrierTarget,
  TranspoCarrierSourceRecord,
  TranspoSource,
  TranspoSourceRun,
} from "./types";

const CARRIERS_DIR = process.env.VERCEL
  ? path.join("/tmp", "transpo-carriers")
  : path.join(process.cwd(), "runtime-data", "intelligence", "transpo", "carriers");

const CARRIERS_FILE = path.join(CARRIERS_DIR, "carrier_master.v1.json");

export function getCarrierMasterFilePath(): string {
  return CARRIERS_FILE;
}

export type PromotionSummary = {
  created: number;
  updated: number;
  skipped: number;
  total: number;
  carrierCount: number;
  persistError?: string;
};

// ── IO ───────────────────────────────────────────────────────────────────────

export async function readCarrierMaster(): Promise<TranspoCarrierTarget[]> {
  try {
    const raw = await fs.readFile(CARRIERS_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c): c is TranspoCarrierTarget =>
        !!c && typeof c === "object" && typeof (c as TranspoCarrierTarget).id === "string",
    );
  } catch {
    return [];
  }
}

/**
 * Best-effort write. Returns null on success or an error message on failure
 * (never throws) so callers degrade gracefully on read-only filesystems.
 */
export async function writeCarrierMaster(
  carriers: TranspoCarrierTarget[],
): Promise<string | null> {
  try {
    await fs.mkdir(CARRIERS_DIR, { recursive: true });
    await fs.writeFile(CARRIERS_FILE, JSON.stringify(carriers, null, 2), "utf8");
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

// ── Identity ──────────────────────────────────────────────────────────────────

type CarrierIdentityFields = Pick<
  TranspoCarrierTarget,
  "companyName" | "dotNumber" | "mcNumber" | "state" | "city"
>;

function normalizeToken(value: string | undefined | null): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Identity key precedence: dotNumber → mcNumber → normalized companyName+state+city.
 * Returns null when there is no usable identity at all (such records are skipped).
 */
export function carrierIdentityKey(rec: CarrierIdentityFields): string | null {
  const dot = (rec.dotNumber ?? "").trim();
  if (dot) return `dot:${normalizeToken(dot)}`;
  const mc = (rec.mcNumber ?? "").trim();
  if (mc) return `mc:${normalizeToken(mc)}`;
  const name = normalizeToken(rec.companyName);
  if (name) return `name:${name}|${normalizeToken(rec.state)}|${normalizeToken(rec.city)}`;
  return null;
}

function idForKey(key: string): string {
  return `transpo-carrier-${key.replace(/[^a-z0-9]+/gi, "-").replace(/-+/g, "-").slice(0, 80)}`;
}

// ── Upsert ─────────────────────────────────────────────────────────────────────

function mergeSource(sources: TranspoSource[], source: TranspoSource): TranspoSource[] {
  return sources.includes(source) ? sources : [...sources, source];
}

function buildTargetFromRecord(
  record: TranspoCarrierSourceRecord,
  source: TranspoSource,
  key: string,
  now: string,
): TranspoCarrierTarget {
  return {
    id: idForKey(key),
    companyName: record.companyName,
    dotNumber: record.dotNumber,
    mcNumber: record.mcNumber,
    city: record.city,
    state: record.state,
    phone: record.phone,
    website: record.website,
    fleetSize: record.fleetSize,
    driverCount: record.driverCount,
    authorityStatus: record.authorityStatus,
    sources: [source],
    evidenceIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

function mergeIntoTarget(
  existing: TranspoCarrierTarget,
  record: TranspoCarrierSourceRecord,
  source: TranspoSource,
  now: string,
): TranspoCarrierTarget {
  // New non-empty values win; otherwise keep existing. companyName stays stable.
  return {
    ...existing,
    companyName: existing.companyName || record.companyName,
    dotNumber: record.dotNumber ?? existing.dotNumber,
    mcNumber: record.mcNumber ?? existing.mcNumber,
    city: record.city ?? existing.city,
    state: record.state ?? existing.state,
    phone: record.phone ?? existing.phone,
    website: record.website ?? existing.website,
    fleetSize: record.fleetSize ?? existing.fleetSize,
    driverCount: record.driverCount ?? existing.driverCount,
    authorityStatus: record.authorityStatus ?? existing.authorityStatus,
    sources: mergeSource(existing.sources, source),
    updatedAt: now,
  };
}

/**
 * Promote a source run's records into the carrier master store.
 * - Existing carrier (same identity key): merge fields, append source, bump updatedAt.
 * - New carrier: create a TranspoCarrierTarget.
 * - Records with no usable identity key are skipped.
 *
 * Returns a summary and persists the store (best-effort).
 */
export async function upsertCarrierTargetsFromSourceRun(
  run: TranspoSourceRun,
): Promise<PromotionSummary> {
  const records = run.records ?? [];
  const source = run.source;
  const now = new Date().toISOString();

  const carriers = await readCarrierMaster();
  const byKey = new Map<string, TranspoCarrierTarget>();
  for (const c of carriers) {
    const k = carrierIdentityKey(c);
    if (k) byKey.set(k, c);
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const record of records) {
    const key = carrierIdentityKey(record);
    if (!key) {
      skipped++;
      continue;
    }
    const existing = byKey.get(key);
    if (existing) {
      byKey.set(key, mergeIntoTarget(existing, record, source, now));
      updated++;
    } else {
      byKey.set(key, buildTargetFromRecord(record, source, key, now));
      created++;
    }
  }

  const next = Array.from(byKey.values());
  const persistError = await writeCarrierMaster(next);

  return {
    created,
    updated,
    skipped,
    total: records.length,
    carrierCount: next.length,
    ...(persistError ? { persistError } : {}),
  };
}
