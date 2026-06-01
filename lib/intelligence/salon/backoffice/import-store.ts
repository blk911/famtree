// lib/intelligence/salon/backoffice/import-store.ts

import { promises as fs } from "fs";
import path from "path";
import type { SalonBackOfficeImportRun } from "./types";
import { resolveSalonBackOfficeBackend } from "./db";

const IMPORT_DIR = process.env.VERCEL
  ? path.join("/tmp", "salon-backoffice-imports")
  : path.join(process.cwd(), "runtime-data", "intelligence", "salon", "backoffice");

const IMPORT_FILE = path.join(IMPORT_DIR, "import_runs.v1.json");

const PREVIEW_CAP = 50;

export function getImportStorePath(): string {
  return IMPORT_FILE;
}

export async function readSalonBackOfficeImportRuns(): Promise<SalonBackOfficeImportRun[]> {
  if ((await resolveSalonBackOfficeBackend()) === "postgres") {
    const { readRunsPostgres } = await import("./import-postgres-store");
    return readRunsPostgres();
  }
  try {
    const raw = await fs.readFile(IMPORT_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is SalonBackOfficeImportRun =>
        !!r && typeof r === "object" && typeof (r as SalonBackOfficeImportRun).id === "string",
    );
  } catch {
    return [];
  }
}

export async function getSalonBackOfficeImportRun(
  id: string,
): Promise<SalonBackOfficeImportRun | undefined> {
  if ((await resolveSalonBackOfficeBackend()) === "postgres") {
    const { getRunPostgres } = await import("./import-postgres-store");
    return getRunPostgres(id);
  }
  const all = await readSalonBackOfficeImportRuns();
  return all.find((r) => r.id === id);
}

export async function appendSalonBackOfficeImportRun(
  run: SalonBackOfficeImportRun,
): Promise<string | null> {
  const toStore: SalonBackOfficeImportRun = {
    ...run,
    normalizedPreview: run.normalizedPreview.slice(0, PREVIEW_CAP),
  };

  if ((await resolveSalonBackOfficeBackend()) === "postgres") {
    const { appendRunPostgres } = await import("./import-postgres-store");
    return appendRunPostgres(toStore);
  }

  try {
    await fs.mkdir(IMPORT_DIR, { recursive: true });
    const existing = await readSalonBackOfficeImportRuns();
    existing.unshift(toStore);
    await fs.writeFile(IMPORT_FILE, JSON.stringify(existing, null, 2), "utf8");
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
