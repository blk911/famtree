// app/api/admin/intelligence/transpo/source-runs/route.ts
// GET /api/admin/intelligence/transpo/source-runs
// Reads the persisted FMCSA run artifact and returns runs newest-first.
//
// Response: { ok: true, runs: TranspoSourceRun[] }

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import type { TranspoSourceRun } from "@/lib/intelligence/transpo/types";

const RUNS_FILE = path.join(
  process.cwd(),
  "runtime-data",
  "intelligence",
  "transpo",
  "source-runs",
  "fmcsa-runs.json",
);

function toTime(value: unknown): number {
  if (typeof value !== "string") return 0;
  const t = Date.parse(value);
  return Number.isNaN(t) ? 0 : t;
}

export async function GET() {
  let runs: TranspoSourceRun[] = [];

  try {
    const raw = await fs.readFile(RUNS_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Only keep well-formed run objects; guard against partial/corrupt rows.
      runs = parsed.filter(
        (r): r is TranspoSourceRun =>
          !!r && typeof r === "object" && typeof (r as TranspoSourceRun).id === "string",
      );
    }
  } catch {
    // Missing file or invalid JSON → treat as empty history.
    runs = [];
  }

  // Newest first.
  runs.sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt));

  return NextResponse.json({ ok: true, runs });
}
