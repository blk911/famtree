// app/api/admin/intelligence/transpo/source-runs/route.ts
// GET /api/admin/intelligence/transpo/source-runs
// Reads the persisted FMCSA run artifact and returns runs newest-first.
//
// Response: { ok: true, runs: TranspoSourceRun[] }

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { readRuns } from "@/lib/intelligence/transpo/sources/source-runs-store";

function toTime(value: unknown): number {
  if (typeof value !== "string") return 0;
  const t = Date.parse(value);
  return Number.isNaN(t) ? 0 : t;
}

export async function GET() {
  const runs = await readRuns();

  // Newest first.
  runs.sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt));

  return NextResponse.json({ ok: true, runs });
}
