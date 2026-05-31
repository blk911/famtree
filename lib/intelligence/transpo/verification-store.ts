// lib/intelligence/transpo/verification-store.ts
// Durable Transpo carrier-verification store. Mirrors the storage strategy of
// source-runs/evidence/carrier-master:
//   DATABASE_URL present → Postgres (transpo_carrier_verification)
//   otherwise            → JSON runtime store (/tmp on Vercel, runtime-data local)
//
// Verifications are de-duplicated by carrierId (one latest row per carrier),
// falling back to carrierKey when carrierId is absent. Writes are best-effort and
// surface a persist error rather than throwing on a read-only filesystem.

import { promises as fs } from "fs";
import path from "path";
import type { TranspoCarrierVerification } from "./verification-types";
import { resolveTranspoBackend } from "./db";

const VERIFICATION_DIR = process.env.VERCEL
  ? path.join("/tmp", "transpo-verification")
  : path.join(process.cwd(), "runtime-data", "intelligence", "transpo", "verification");

const VERIFICATION_FILE = path.join(VERIFICATION_DIR, "carrier_verification.v1.json");

export function getVerificationStorePath(): string {
  return VERIFICATION_FILE;
}

export type UpsertVerificationResult = {
  created: number;
  updated: number;
  verificationCount: number;
  path: string;
  persistError?: string;
};

/** De-dupe key: carrierId when present, else carrierKey, else row id. */
function dedupeKey(v: TranspoCarrierVerification): string {
  return (v.carrierId || v.carrierKey || v.id).trim();
}

// ── IO ───────────────────────────────────────────────────────────────────────

export async function readCarrierVerifications(): Promise<TranspoCarrierVerification[]> {
  if ((await resolveTranspoBackend()) === "postgres") {
    const { readVerificationsPostgres } = await import("./verification-postgres-store");
    return readVerificationsPostgres();
  }
  try {
    const raw = await fs.readFile(VERIFICATION_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is TranspoCarrierVerification =>
        !!v && typeof v === "object" && typeof (v as TranspoCarrierVerification).id === "string",
    );
  } catch {
    return [];
  }
}

/**
 * Best-effort write of the full verification set. Returns null on success or an
 * error message on failure (never throws).
 */
export async function writeCarrierVerifications(
  items: TranspoCarrierVerification[],
): Promise<string | null> {
  if ((await resolveTranspoBackend()) === "postgres") {
    const { writeVerificationsPostgres } = await import("./verification-postgres-store");
    return writeVerificationsPostgres(items);
  }
  try {
    await fs.mkdir(VERIFICATION_DIR, { recursive: true });
    await fs.writeFile(VERIFICATION_FILE, JSON.stringify(items, null, 2), "utf8");
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

/**
 * Upsert verification rows by carrierId/carrierKey: existing rows are replaced
 * with the incoming (latest) verification, new ones are appended. Persists
 * best-effort and returns created/updated counts plus the resulting total.
 */
export async function upsertCarrierVerifications(
  items: TranspoCarrierVerification[],
): Promise<UpsertVerificationResult> {
  const existing = await readCarrierVerifications();
  const byKey = new Map<string, TranspoCarrierVerification>();
  for (const v of existing) byKey.set(dedupeKey(v), v);

  let created = 0;
  let updated = 0;

  for (const item of items) {
    const k = dedupeKey(item);
    if (byKey.has(k)) {
      // Preserve original createdAt on update.
      const prev = byKey.get(k)!;
      byKey.set(k, { ...item, createdAt: prev.createdAt || item.createdAt });
      updated++;
    } else {
      byKey.set(k, item);
      created++;
    }
  }

  const next = Array.from(byKey.values());
  const backend = await resolveTranspoBackend();
  const persistError = await writeCarrierVerifications(next);

  return {
    created,
    updated,
    verificationCount: next.length,
    path: backend === "postgres" ? "postgres:transpo_carrier_verification" : VERIFICATION_FILE,
    ...(persistError ? { persistError } : {}),
  };
}

export async function getCarrierVerificationByCarrierId(
  carrierId: string,
): Promise<TranspoCarrierVerification | undefined> {
  const all = await readCarrierVerifications();
  return all.find((v) => v.carrierId === carrierId);
}
