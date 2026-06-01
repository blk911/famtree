// lib/intelligence/salon/public-presence/presence-store.ts

import { promises as fs } from "fs";
import path from "path";
import type { SalonPublicPresenceResult } from "./types";
import { prisma, resolveSalonPresenceBackend } from "./db";

const DATA_DIR = process.env.VERCEL
  ? "/tmp/salon-public-presence"
  : path.resolve(process.cwd(), "runtime-data", "intelligence", "salon", "public-presence");

const RESULTS_FILE = path.join(DATA_DIR, "results.json");

type JsonStore = { results: SalonPublicPresenceResult[] };

async function ensureJsonDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readJsonStore(): Promise<JsonStore> {
  try {
    const raw = await fs.readFile(RESULTS_FILE, "utf8");
    return JSON.parse(raw) as JsonStore;
  } catch {
    return { results: [] };
  }
}

async function writeJsonStore(store: JsonStore): Promise<void> {
  await ensureJsonDir();
  await fs.writeFile(RESULTS_FILE, JSON.stringify(store, null, 2), "utf8");
}

function makeId(prospectId: string, url: string): string {
  const slug = url.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80);
  return `presence-${prospectId}-${slug}`.slice(0, 120);
}

export async function upsertPresenceResults(
  rows: SalonPublicPresenceResult[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const backend = await resolveSalonPresenceBackend();
  let written = 0;

  if (backend === "postgres") {
    for (const row of rows) {
      const id = row.id || makeId(row.prospectId ?? "unknown", row.url);
      try {
        await prisma.$executeRaw`
          INSERT INTO salon_public_presence_results (
            id, prospect_id, source, url, title, snippet, url_type,
            provider, provider_label, confidence, evidence, discovered_at
          ) VALUES (
            ${id},
            ${row.prospectId ?? null},
            ${row.source},
            ${row.url},
            ${row.title ?? null},
            ${row.snippet ?? null},
            ${row.urlType},
            ${row.provider ?? null},
            ${row.providerLabel ?? null},
            ${row.confidence},
            ${JSON.stringify(row.evidence)}::jsonb,
            ${row.discoveredAt}::timestamptz
          )
          ON CONFLICT (prospect_id, url) DO UPDATE SET
            source = EXCLUDED.source,
            title = EXCLUDED.title,
            snippet = EXCLUDED.snippet,
            url_type = EXCLUDED.url_type,
            provider = EXCLUDED.provider,
            provider_label = EXCLUDED.provider_label,
            confidence = EXCLUDED.confidence,
            evidence = EXCLUDED.evidence,
            discovered_at = EXCLUDED.discovered_at
        `;
        written++;
      } catch {
        // skip row on conflict/schema race
      }
    }
    return written;
  }

  const store = await readJsonStore();
  const byKey = new Map(store.results.map((r) => [`${r.prospectId}:${r.url}`, r]));
  for (const row of rows) {
    const key = `${row.prospectId}:${row.url}`;
    const id = row.id || makeId(row.prospectId ?? "unknown", row.url);
    byKey.set(key, { ...row, id });
    written++;
  }
  store.results = Array.from(byKey.values()).sort((a, b) =>
    b.discoveredAt.localeCompare(a.discoveredAt),
  );
  await writeJsonStore(store);
  return written;
}

export async function listPresenceResults(options?: {
  prospectId?: string;
  limit?: number;
}): Promise<SalonPublicPresenceResult[]> {
  const limit = options?.limit ?? 200;
  const backend = await resolveSalonPresenceBackend();

  if (backend === "postgres") {
    try {
      if (options?.prospectId) {
        const rows = await prisma.$queryRaw<
          Array<{
            id: string;
            prospect_id: string | null;
            source: string;
            url: string;
            title: string | null;
            snippet: string | null;
            url_type: string;
            provider: string | null;
            provider_label: string | null;
            confidence: number | null;
            evidence: unknown;
            discovered_at: Date | string;
          }>
        >`
          SELECT * FROM salon_public_presence_results
          WHERE prospect_id = ${options.prospectId}
          ORDER BY discovered_at DESC
          LIMIT ${limit}
        `;
        return rows.map(rowToResult);
      }
      const rows = await prisma.$queryRaw<
        Array<{
          id: string;
          prospect_id: string | null;
          source: string;
          url: string;
          title: string | null;
          snippet: string | null;
          url_type: string;
          provider: string | null;
          provider_label: string | null;
          confidence: number | null;
          evidence: unknown;
          discovered_at: Date | string;
        }>
      >`
        SELECT * FROM salon_public_presence_results
        ORDER BY discovered_at DESC
        LIMIT ${limit}
      `;
      return rows.map(rowToResult);
    } catch {
      return [];
    }
  }

  const store = await readJsonStore();
  let list = store.results;
  if (options?.prospectId) {
    list = list.filter((r) => r.prospectId === options.prospectId);
  }
  return list.slice(0, limit);
}

function rowToResult(row: {
  id: string;
  prospect_id: string | null;
  source: string;
  url: string;
  title: string | null;
  snippet: string | null;
  url_type: string;
  provider: string | null;
  provider_label: string | null;
  confidence: number | null;
  evidence: unknown;
  discovered_at: Date | string;
}): SalonPublicPresenceResult {
  const evidence =
    typeof row.evidence === "string"
      ? (JSON.parse(row.evidence) as string[])
      : Array.isArray(row.evidence)
        ? (row.evidence as string[])
        : [];
  return {
    id: row.id,
    prospectId: row.prospect_id ?? undefined,
    source: row.source as SalonPublicPresenceResult["source"],
    url: row.url,
    title: row.title ?? undefined,
    snippet: row.snippet ?? undefined,
    urlType: row.url_type as SalonPublicPresenceResult["urlType"],
    provider: row.provider ?? undefined,
    providerLabel: row.provider_label ?? undefined,
    confidence: Number(row.confidence ?? 0),
    evidence,
    discoveredAt:
      row.discovered_at instanceof Date
        ? row.discovered_at.toISOString()
        : String(row.discovered_at),
  };
}
