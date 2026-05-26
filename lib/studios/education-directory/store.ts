// lib/studios/education-directory/store.ts
// Flat JSON run-history storage for Education Directory Import.
// Mirrors the pattern used by lib/studios/styleseat/store.ts.

import { promises as fs } from "fs";
import path from "path";
import type { DirectoryRunFile, DirectoryRunSummary } from "./types";

const DATA_DIR = process.env.VERCEL
  ? "/tmp/studios-edu-directory"
  : path.resolve(process.cwd(), "runtime-data", "studios", "education-directory");

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export function generateDirectoryRunId(): string {
  return `dir-run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function saveDirectoryRun(file: DirectoryRunFile): Promise<void> {
  await ensureDir();
  const filePath = path.join(DATA_DIR, `${file.summary.runId}.json`);
  await fs.writeFile(filePath, JSON.stringify(file, null, 2), "utf-8");
}

export async function loadDirectoryRun(runId: string): Promise<DirectoryRunFile | null> {
  await ensureDir();
  try {
    const filePath = path.join(DATA_DIR, `${runId}.json`);
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as DirectoryRunFile;
  } catch {
    return null;
  }
}

export async function listDirectoryRuns(): Promise<DirectoryRunFile[]> {
  await ensureDir();
  try {
    const files = await fs.readdir(DATA_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json")).sort().reverse();

    const runs: DirectoryRunFile[] = [];
    for (const f of jsonFiles.slice(0, 50)) {
      try {
        const raw = await fs.readFile(path.join(DATA_DIR, f), "utf-8");
        runs.push(JSON.parse(raw) as DirectoryRunFile);
      } catch {
        // skip corrupt files
      }
    }
    return runs;
  } catch {
    return [];
  }
}

export async function listDirectoryRunSummaries(): Promise<DirectoryRunSummary[]> {
  const runs = await listDirectoryRuns();
  return runs.map((r) => r.summary);
}
