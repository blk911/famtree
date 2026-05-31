// lib/intelligence/transpo/evidence-store.ts
// Transpo Evidence Lake — raw, de-duplicated proof extracted from source-run
// records before carrier resolution. Each source-run record fans out into
// typed evidence items (identity, authority, fleet, contact, location, website).
//
// On Vercel the deployment filesystem is read-only, so writes go to /tmp (same
// strategy as source-runs-store / carrier-master-store); locally they persist
// under runtime-data/. Reads/writes share one path resolver and writes are
// best-effort — a read-only filesystem returns a reason instead of throwing.

import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import type {
  TranspoEvidence,
  TranspoCarrierSourceRecord,
  TranspoSourceRun,
} from "./types";

const EVIDENCE_DIR = process.env.VERCEL
  ? path.join("/tmp", "transpo-evidence")
  : path.join(process.cwd(), "runtime-data", "intelligence", "transpo", "evidence");

const EVIDENCE_FILE = path.join(EVIDENCE_DIR, "carrier_evidence.v1.json");

export function getEvidenceFilePath(): string {
  return EVIDENCE_FILE;
}

type EvidenceType = TranspoEvidence["evidenceType"];

export type AppendEvidenceResult = {
  created: number;
  skipped: number;
  evidenceCount: number;
  persistError?: string;
};

// ── IO ───────────────────────────────────────────────────────────────────────

export async function readTranspoEvidence(): Promise<TranspoEvidence[]> {
  try {
    const raw = await fs.readFile(EVIDENCE_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is TranspoEvidence =>
        !!e && typeof e === "object" && typeof (e as TranspoEvidence).id === "string",
    );
  } catch {
    return [];
  }
}

/**
 * Best-effort write. Returns null on success or an error message on failure
 * (never throws) so callers degrade gracefully on read-only filesystems.
 */
export async function writeTranspoEvidence(
  evidence: TranspoEvidence[],
): Promise<string | null> {
  try {
    await fs.mkdir(EVIDENCE_DIR, { recursive: true });
    await fs.writeFile(EVIDENCE_FILE, JSON.stringify(evidence, null, 2), "utf8");
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

/**
 * Append evidence items, de-duplicating against what is already stored by
 * carrierKey + source + evidenceType + value. Persists best-effort.
 */
export async function appendTranspoEvidence(
  evidenceItems: TranspoEvidence[],
): Promise<AppendEvidenceResult> {
  const existing = await readTranspoEvidence();
  const seen = new Set(existing.map(dedupKey));
  const next = [...existing];
  let created = 0;
  let skipped = 0;

  for (const item of evidenceItems) {
    const k = dedupKey(item);
    if (seen.has(k)) {
      skipped++;
      continue;
    }
    seen.add(k);
    next.push(item);
    created++;
  }

  const persistError = await writeTranspoEvidence(next);
  return {
    created,
    skipped,
    evidenceCount: next.length,
    ...(persistError ? { persistError } : {}),
  };
}

// ── Keys & helpers ─────────────────────────────────────────────────────────────

function normalizeToken(value: string | undefined | null): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function dedupKey(e: TranspoEvidence): string {
  return `${e.carrierKey}|${e.source}|${e.evidenceType}|${e.value}`;
}

/**
 * Evidence carrier key: dot:<dotNumber> → mc:<mcNumber> →
 * name:<normalized companyName>|<state>|<city>. Raw DOT/MC are preserved so the
 * resolver can recover them; only the name fallback is normalized.
 */
export function evidenceCarrierKey(
  rec: Pick<TranspoCarrierSourceRecord, "companyName" | "dotNumber" | "mcNumber" | "state" | "city">,
): string | null {
  const dot = (rec.dotNumber ?? "").trim();
  if (dot) return `dot:${dot}`;
  const mc = (rec.mcNumber ?? "").trim();
  if (mc) return `mc:${mc}`;
  const name = normalizeToken(rec.companyName);
  if (name) return `name:${name}|${normalizeToken(rec.state)}|${normalizeToken(rec.city)}`;
  return null;
}

/** Encodes present scalar facets into a readable, parseable "k=v; k=v" string. */
export function encodeFacets(obj: Record<string, string | number | undefined | null>): string {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
    .map(([k, v]) => `${k}=${String(v).trim()}`)
    .join("; ");
}

/** Parses an encodeFacets() string back into a flat record. */
export function parseFacets(value: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of value.split(";")) {
    const idx = part.indexOf("=");
    if (idx > 0) out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  }
  return out;
}

function evidenceId(carrierKey: string, source: string, type: string, value: string): string {
  const h = crypto
    .createHash("sha1")
    .update(`${carrierKey}|${source}|${type}|${value}`)
    .digest("hex")
    .slice(0, 16);
  return `ev-${h}`;
}

// ── Builder ─────────────────────────────────────────────────────────────────────

/**
 * Fan a source run's records out into typed evidence items. Records with no
 * usable carrier identity are skipped. The returned batch is de-duplicated
 * internally; appendTranspoEvidence() de-duplicates against the stored lake.
 */
export function buildEvidenceFromSourceRun(run: TranspoSourceRun): TranspoEvidence[] {
  const source = run.source;
  const observedAt = run.createdAt || new Date().toISOString();
  const out: TranspoEvidence[] = [];

  for (const rec of run.records ?? []) {
    const carrierKey = evidenceCarrierKey(rec);
    if (!carrierKey) continue;

    const push = (type: EvidenceType, value: string | undefined, confidence: number) => {
      if (value === undefined || value === null || String(value).trim() === "") return;
      const v = String(value);
      out.push({
        id: evidenceId(carrierKey, source, type, v),
        carrierKey,
        source,
        evidenceType: type,
        value: v,
        confidence,
        sourceUrl: rec.sourceUrl,
        observedAt,
      });
    };

    push("identity", rec.companyName, 0.9);
    push("authority", rec.authorityStatus, 0.7);
    const fleet = encodeFacets({ fleetSize: rec.fleetSize, driverCount: rec.driverCount });
    if (fleet) push("fleet", fleet, 0.6);
    push("contact", rec.phone, 0.7);
    const location = encodeFacets({ city: rec.city, state: rec.state, address: rec.address });
    if (location) push("location", location, 0.6);
    push("website", rec.website, 0.8);
  }

  const seen = new Set<string>();
  return out.filter((e) => {
    const k = dedupKey(e);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
