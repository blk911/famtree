// GET /api/admin/intelligence/salon/pipeline/summary

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { buildSalonPipelineSummary } from "@/lib/intelligence/salon/pipeline/pipeline-summary";

export async function GET() {
  try {
    const summary = await buildSalonPipelineSummary();
    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "pipeline summary failed", detail },
      { status: 500 },
    );
  }
}
