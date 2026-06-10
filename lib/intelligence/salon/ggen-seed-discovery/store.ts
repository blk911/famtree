// lib/intelligence/salon/ggen-seed-discovery/store.ts

import { promises as fs } from "fs";
import path from "path";
import {
  getGgenDiscoveryDataDir,
  getGgenDiscoveryIndexPath,
  getGgenDiscoveryRunsDir,
} from "./paths";
import type { GgenDiscoveryRun, GgenDiscoveryRunSummary } from "./types";

const LOG_PREFIX = "[ggen-discovery/store]";

type IndexFile = { runs: GgenDiscoveryRunSummary[] };

function emptyIndex(): IndexFile {
  return { runs: [] };
}

function isRunSummary(value: unknown): value is GgenDiscoveryRunSummary {
  if (!value || typeof value !== "object") return false;
  const row = value as GgenDiscoveryRunSummary;
  return (
    typeof row.runId === "string" &&
    typeof row.createdAt === "string" &&
    typeof row.seedCount === "number" &&
    typeof row.foundCount === "number"
  );
}

function normalizeIndex(parsed: unknown): IndexFile {
  if (!parsed || typeof parsed !== "object") return emptyIndex();
  const runs = (parsed as IndexFile).runs;
  if (!Array.isArray(runs)) return emptyIndex();
  return { runs: runs.filter(isRunSummary) };
}

async function ensureStoreReady(): Promise<void> {
  const dataDir = getGgenDiscoveryDataDir();
  const runsDir = getGgenDiscoveryRunsDir();
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(runsDir, { recursive: true });
}

async function readIndex(): Promise<IndexFile> {
  try {
    const raw = await fs.readFile(getGgenDiscoveryIndexPath(), "utf8");
    return normalizeIndex(JSON.parse(raw) as unknown);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (code && code !== "ENOENT") {
      console.warn(`${LOG_PREFIX} readIndex failed (${code}), using empty index`);
    }
    return emptyIndex();
  }
}

async function writeIndex(index: IndexFile): Promise<void> {
  try {
    await ensureStoreReady();
    await fs.writeFile(getGgenDiscoveryIndexPath(), `${JSON.stringify(index, null, 2)}\n`, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${LOG_PREFIX} writeIndex failed: ${message}`);
    throw error;
  }
}

export async function saveGgenDiscoveryRun(run: GgenDiscoveryRun): Promise<string> {
  await ensureStoreReady();
  const filePath = path.join(getGgenDiscoveryRunsDir(), `${run.runId}.json`);
  await fs.writeFile(filePath, `${JSON.stringify(run, null, 2)}\n`, "utf8");

  const index = await readIndex();
  const summary: GgenDiscoveryRunSummary = {
    runId: run.runId,
    createdAt: run.createdAt,
    seedCount: run.seedCount,
    foundCount: run.foundCount,
  };
  index.runs = [summary, ...index.runs.filter((r) => r.runId !== run.runId)].slice(0, 50);
  await writeIndex(index);
  return filePath;
}

export async function loadGgenDiscoveryRun(runId: string): Promise<GgenDiscoveryRun | null> {
  try {
    const safeId = path.basename(runId);
    const raw = await fs.readFile(path.join(getGgenDiscoveryRunsDir(), `${safeId}.json`), "utf8");
    const parsed = JSON.parse(raw) as GgenDiscoveryRun;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.results)) {
      console.warn(`${LOG_PREFIX} run "${safeId}" has invalid shape`);
      return null;
    }
    return parsed;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (code && code !== "ENOENT") {
      console.warn(`${LOG_PREFIX} loadGgenDiscoveryRun("${runId}") failed (${code})`);
    }
    return null;
  }
}

export async function listGgenDiscoveryRuns(): Promise<GgenDiscoveryRunSummary[]> {
  try {
    const index = await readIndex();
    return index.runs;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${LOG_PREFIX} listGgenDiscoveryRuns failed: ${message}`);
    return [];
  }
}

export function getGgenDiscoveryStorePath(): string {
  return getGgenDiscoveryDataDir();
}
