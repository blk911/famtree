// lib/intelligence/salon/ggen-seed-discovery/store.ts

import { promises as fs } from "fs";
import path from "path";
import type { GgenDiscoveryRun, GgenDiscoveryRunSummary } from "./types";

const DATA_DIR = process.env.VERCEL
  ? "/tmp/studios-ggen-discovery"
  : path.resolve(process.cwd(), "runtime-data", "studios", "ggen-seed-discovery");

const RUNS_DIR = path.join(DATA_DIR, "runs");
const INDEX_FILE = path.join(DATA_DIR, "index.json");

async function ensureDir(): Promise<void> {
  await fs.mkdir(RUNS_DIR, { recursive: true });
}

type IndexFile = { runs: GgenDiscoveryRunSummary[] };

async function readIndex(): Promise<IndexFile> {
  try {
    const raw = await fs.readFile(INDEX_FILE, "utf8");
    return JSON.parse(raw) as IndexFile;
  } catch {
    return { runs: [] };
  }
}

async function writeIndex(index: IndexFile): Promise<void> {
  await fs.writeFile(INDEX_FILE, JSON.stringify(index, null, 2), "utf8");
}

export async function saveGgenDiscoveryRun(run: GgenDiscoveryRun): Promise<string> {
  await ensureDir();
  const filePath = path.join(RUNS_DIR, `${run.runId}.json`);
  await fs.writeFile(filePath, JSON.stringify(run, null, 2), "utf8");

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
    const raw = await fs.readFile(path.join(RUNS_DIR, `${runId}.json`), "utf8");
    return JSON.parse(raw) as GgenDiscoveryRun;
  } catch {
    return null;
  }
}

export async function listGgenDiscoveryRuns(): Promise<GgenDiscoveryRunSummary[]> {
  const index = await readIndex();
  return index.runs;
}

export function getGgenDiscoveryStorePath(): string {
  return DATA_DIR;
}
