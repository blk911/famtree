// lib/studios/creator-lab/hashtag-harvest/store.ts
// Saves and loads hashtag harvest run files.
// One JSON file per run: {runId}.json

import { promises as fs } from "fs";
import path from "path";
import type { HarvestRunFile } from "./types";

const DATA_DIR = process.env.VERCEL
  ? "/tmp/hashtag-harvest"
  : path.resolve(process.cwd(), "runtime-data", "studios", "hashtag-harvest");

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function filePath(runId: string): string {
  const safe = runId.replace(/[^a-z0-9_\-]/gi, "-").slice(0, 80);
  return path.join(DATA_DIR, `${safe}.json`);
}

export async function saveHarvestRun(file: HarvestRunFile): Promise<void> {
  await ensureDir();
  await fs.writeFile(filePath(file.run.runId), JSON.stringify(file, null, 2), "utf-8");
}

export async function loadHarvestRun(runId: string): Promise<HarvestRunFile | null> {
  try {
    const raw = await fs.readFile(filePath(runId), "utf-8");
    return JSON.parse(raw) as HarvestRunFile;
  } catch {
    return null;
  }
}

export async function listHarvestRuns(): Promise<HarvestRunFile[]> {
  await ensureDir();
  let files: string[];
  try {
    files = await fs.readdir(DATA_DIR);
  } catch {
    return [];
  }

  const runs: HarvestRunFile[] = [];
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    try {
      const raw = await fs.readFile(path.join(DATA_DIR, f), "utf-8");
      runs.push(JSON.parse(raw) as HarvestRunFile);
    } catch {
      // skip malformed
    }
  }
  return runs.sort((a, b) => b.run.createdAt.localeCompare(a.run.createdAt));
}

export function generateRunId(): string {
  return `harvest-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
