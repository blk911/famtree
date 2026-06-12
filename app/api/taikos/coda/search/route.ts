import { NextRequest, NextResponse } from "next/server";
import { buildAiosContextPacket } from "@/lib/taikos/context/context-builder";
import { runCodaSearch } from "@/lib/taikos/coda/coda";
import { getActiveVmbAnalysis } from "@/lib/vmb/active-analysis-resolver";
import { getVmbBookAnalysisForTrial } from "@/lib/vmb/book-analysis/analysis-store";
import { VMB_TRIAL_COOKIE } from "@/lib/vmb/paths";

export async function POST(req: NextRequest) {
  const trialId = req.cookies.get(VMB_TRIAL_COOKIE)?.value?.trim();
  if (!trialId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  let query = "";
  try {
    const body = (await req.json()) as { query?: string };
    query = body.query?.trim() ?? "";
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  if (!query) {
    return NextResponse.json({ ok: false, error: "query is required" }, { status: 400 });
  }

  try {
    const ctx = await buildAiosContextPacket({
      trialId,
      pathname: "/vmb/today",
      recordLogin: false,
    });
    if (!ctx) {
      return NextResponse.json({ ok: false, error: "Workspace not found" }, { status: 404 });
    }

    const resolved = await getActiveVmbAnalysis(trialId);
    const analysis = resolved.analysisId
      ? await getVmbBookAnalysisForTrial(resolved.analysisId, trialId)
      : undefined;

    const result = runCodaSearch(query, ctx, analysis, ctx.codaSummary?.insights ?? []);
    return NextResponse.json({ ok: true, data: result });
  } catch (err) {
    console.error("[taikos:coda:search]", err);
    return NextResponse.json({ ok: false, error: "Search failed" }, { status: 500 });
  }
}
