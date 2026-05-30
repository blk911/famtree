// app/api/admin/intelligence/transpo/source-runs/fmcsa/route.ts
// POST /api/admin/intelligence/transpo/source-runs/fmcsa
// Runs a test FMCSA source pull and persists the resulting source run artifact.
//
// Body: { market: string, state?: string, city?: string, keyword?: string, limit?: number, notes?: string }
// Response: { ok: true, run: SourceRun } | { ok: false, error: string }

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { runFmcsaTestPull } from "@/lib/intelligence/transpo/sources/fmcsa-source";
import type {
  TranspoSourceRun,
  TranspoSourceRunInput,
} from "@/lib/intelligence/transpo/types";

const RUNS_DIR = path.join(
  process.cwd(),
  "runtime-data",
  "intelligence",
  "transpo",
  "source-runs",
);
const RUNS_FILE = path.join(RUNS_DIR, "fmcsa-runs.json");

async function readRuns(): Promise<TranspoSourceRun[]> {
  try {
    const raw = await fs.readFile(RUNS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TranspoSourceRun[]) : [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      market?: string;
      state?: string;
      city?: string;
      keyword?: string;
      limit?: number;
      notes?: string;
    };

    const market = (body.market ?? "").trim();
    if (!market) {
      return NextResponse.json(
        { ok: false, error: "market is required" },
        { status: 400 },
      );
    }

    const input: TranspoSourceRunInput = {
      market,
      state: (body.state ?? "").trim() || undefined,
      city: (body.city ?? "").trim() || undefined,
      keyword: (body.keyword ?? "").trim() || undefined,
      limit:
        typeof body.limit === "number" && Number.isFinite(body.limit)
          ? body.limit
          : undefined,
      notes: (body.notes ?? "").trim() || undefined,
    };

    const { sourceMode, records } = await runFmcsaTestPull(input);

    const run: TranspoSourceRun = {
      id: `transpo-fmcsa-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      vertical: "transpo",
      source: "fmcsa",
      sourceMode,
      input,
      recordCount: records.length,
      records,
      createdAt: new Date().toISOString(),
    };

    await fs.mkdir(RUNS_DIR, { recursive: true });
    const runs = await readRuns();
    runs.push(run);
    await fs.writeFile(RUNS_FILE, JSON.stringify(runs, null, 2), "utf8");

    return NextResponse.json({ ok: true, run });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "fmcsa test pull failed", detail },
      { status: 500 },
    );
  }
}
