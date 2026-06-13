import type { NextRequest } from "next/server";
import { getVmbBookAnalysis } from "@/lib/vmb/book-analysis/analysis-store";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";

export type ResolvedTrialFromRequest = {
  trialId?: string;
  source: "cookie" | "analysis_query" | "analysis_session" | "none";
  analysisHintId?: string;
};

async function trialIdFromAnalysisId(analysisId?: string): Promise<string | undefined> {
  const id = analysisId?.trim();
  if (!id) return undefined;
  const analysis = await getVmbBookAnalysis(id);
  return analysis?.trialId?.trim() || undefined;
}

/** Resolve salon trial id from cookie, then ?analysis= / ?session= hints. */
export async function resolveTrialIdFromRequest(req: NextRequest): Promise<ResolvedTrialFromRequest> {
  const cookieTrialId = getVmbTrialIdFromRequest(req);
  if (cookieTrialId) {
    return { trialId: cookieTrialId, source: "cookie" };
  }

  const queryAnalysisId = req.nextUrl.searchParams.get("analysis")?.trim();
  const queryTrialId = await trialIdFromAnalysisId(queryAnalysisId);
  if (queryTrialId) {
    return {
      trialId: queryTrialId,
      source: "analysis_query",
      analysisHintId: queryAnalysisId,
    };
  }

  const sessionAnalysisId = req.nextUrl.searchParams.get("session")?.trim();
  const sessionTrialId = await trialIdFromAnalysisId(sessionAnalysisId);
  if (sessionTrialId) {
    return {
      trialId: sessionTrialId,
      source: "analysis_session",
      analysisHintId: sessionAnalysisId,
    };
  }

  return { source: "none" };
}
