export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { answerSalonQuery } from "@/lib/taikos/salon-qa/answer-salon-query";
import { resolveBookRecordsForSalonQa } from "@/lib/taikos/salon-qa/resolve-book-records";
import { getActiveVmbAnalysis } from "@/lib/vmb/active-analysis-resolver";
import { getVmbBookAnalysisForTrial } from "@/lib/vmb/book-analysis/analysis-store";
import { resolveTrialIdFromRequest } from "@/lib/vmb/resolve-trial-from-request";

export async function POST(req: NextRequest) {
  const trialResolution = await resolveTrialIdFromRequest(req);
  const trialId = trialResolution.trialId;
  if (!trialId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  let question = "";
  let analysisIdHint = "";
  try {
    const body = (await req.json()) as { question?: string; analysisId?: string };
    question = body.question?.trim() ?? "";
    analysisIdHint = body.analysisId?.trim() ?? "";
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  if (!question) {
    return NextResponse.json({ ok: false, error: "question is required" }, { status: 400 });
  }

  try {
    const resolved = await getActiveVmbAnalysis(trialId, {
      queryId: analysisIdHint || req.nextUrl.searchParams.get("analysis") || undefined,
    });
    if (!resolved.analysisId) {
      return NextResponse.json(
        {
          ok: false,
          error: "NO_ACTIVE_BOOK",
          message: "Upload or load a client book first.",
        },
        { status: 404 },
      );
    }

    const analysis = await getVmbBookAnalysisForTrial(resolved.analysisId, trialId);
    if (!analysis) {
      return NextResponse.json(
        {
          ok: false,
          error: "NO_ACTIVE_BOOK",
          message: "Upload or load a client book first.",
        },
        { status: 404 },
      );
    }

    const records = await resolveBookRecordsForSalonQa(analysis);
    const answer = answerSalonQuery({ question, analysis, records });
    return NextResponse.json({ ok: true, data: answer });
  } catch (err) {
    console.error("[taikos:salon-qa]", err);
    return NextResponse.json({ ok: false, error: "Salon Q&A failed" }, { status: 500 });
  }
}
