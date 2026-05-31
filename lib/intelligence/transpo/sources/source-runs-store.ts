// lib/intelligence/transpo/sources/source-runs-store.ts
// Shared persistence for Transpo FMCSA source-run artifacts.
//
// On Vercel the deployment filesystem is read-only, so writes go to /tmp (the
// same strategy the salon prospect JSON store uses). Locally they persist under
// runtime-data/. Reads and writes share one path resolver so the POST (write)
// and GET (read) routes never diverge. appendRun() is best-effort and NEVER
// throws — a read-only filesystem degrades to a returned warning, not a 500.

import { promises as fs } from "fs";
import path from "path";
import type { TranspoSourceRun } from "../types";

const RUNS_DIR = process.env.VERCEL
  ? path.join("/tmp", "transpo-source-runs")
  : path.join(process.cwd(), "runtime-data", "intelligence", "transpo", "source-runs");

const RUNS_FILE = path.join(RUNS_DIR, "fmcsa-runs.json");

export function getRunsFilePath(): string {
  return RUNS_FILE;
}

export async function readRuns(): Promise<TranspoSourceRun[]> {
  try {
    const raw = await fs.readFile(RUNS_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is TranspoSourceRun =>
        !!r && typeof r === "object" && typeof (r as TranspoSourceRun).id === "string",
    );
  } catch {
    // Missing file or invalid JSON → treat as empty history.
    return [];
  }
}

/**
 * Best-effort append. Returns null on success, or an error message on failure.
 * Never throws — callers can persist-and-continue even on read-only filesystems.
 */
export async function appendRun(run: TranspoSourceRun): Promise<string | null> {
  try {
    await fs.mkdir(RUNS_DIR, { recursive: true });
    const runs = await readRuns();
    runs.push(run);
    await fs.writeFile(RUNS_FILE, JSON.stringify(runs, null, 2), "utf8");
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
