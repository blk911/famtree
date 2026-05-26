// lib/studios/styleseat/store.ts
// Saves and loads StyleSeat harvest run files.
// One JSON file per run: {runId}.json
// Mirrors the hashtag-harvest/store.ts pattern.

import { promises as fs } from "fs";
import path from "path";
import type { StyleSeatRunFile } from "./types";

const DATA_DIR = process.env.VERCEL
  ? "/tmp/studios-styleseat"
  : path.resolve(process.cwd(), "runtime-data", "studios", "styleseat");

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function filePath(runId: string): string {
  const safe = runId.replace(/[^a-z0-9_\-]/gi, "-").slice(0, 80);
  return path.join(DATA_DIR, `${safe}.json`);
}

export function generateStyleSeatRunId(): string {
  return `styleseat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function saveStyleSeatRun(file: StyleSeatRunFile): Promise<void> {
  await ensureDir();
  await fs.writeFile(filePath(file.run.runId), JSON.stringify(file, null, 2), "utf-8");
}

export async function loadStyleSeatRun(runId: string): Promise<StyleSeatRunFile | null> {
  try {
    const raw = await fs.readFile(filePath(runId), "utf-8");
    return JSON.parse(raw) as StyleSeatRunFile;
  } catch {
    return null;
  }
}

export async function listStyleSeatRuns(): Promise<StyleSeatRunFile[]> {
  await ensureDir();
  let files: string[];
  try {
    files = await fs.readdir(DATA_DIR);
  } catch {
    return [];
  }

  const runs: StyleSeatRunFile[] = [];
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    try {
      const raw = await fs.readFile(path.join(DATA_DIR, f), "utf-8");
      runs.push(JSON.parse(raw) as StyleSeatRunFile);
    } catch {
      // skip malformed files
    }
  }

  return runs.sort((a, b) => b.run.createdAt.localeCompare(a.run.createdAt));
}
