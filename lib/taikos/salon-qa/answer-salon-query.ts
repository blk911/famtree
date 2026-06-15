import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import type { VmbBookRecord } from "@/types/vmb/provider-ingest";
import { answerClientQuery } from "./answer-client-query";
import { answerIntelligenceQuery } from "./answer-intelligence-query";
import { answerOpportunityQuery } from "./answer-opportunity-query";
import {
  boundaryAnswerHeadline,
  boundaryFollowUpPrompt,
  buildSalonQaBoundaryContext,
  classifySalonQaBoundary,
  type SalonQaBoundaryDecision,
} from "./boundary-policy";
import { matchSalonQuery } from "./match-salon-query";
import { resolveBookRecordsSync } from "./resolve-book-records";
import type { SalonQaAnswer, SalonQaFollowUpQueryAction } from "./types";

export type AnswerSalonQueryParams = {
  question: string;
  analysis: VmbBookAnalysisResult;
  records?: VmbBookRecord[];
  ownerName?: string;
};

function buildBoundarySalonAnswer(question: string, decision: SalonQaBoundaryDecision): SalonQaAnswer {
  const firstSuggestion = decision.suggestedQuestions?.[0];
  const suggestedAction: SalonQaFollowUpQueryAction | undefined = firstSuggestion
    ? {
        kind: "follow_up_query",
        label: firstSuggestion,
        question: firstSuggestion,
      }
    : undefined;

  return {
    question,
    queryMode: "intelligence",
    intent: "boundary",
    boundary: decision.boundary,
    confidence: 1,
    headline: boundaryAnswerHeadline(decision.boundary),
    answerText: decision.safeReply ?? "",
    results: [],
    suggestedCards: [],
    suggestedAction,
    suggestedQuestions: decision.suggestedQuestions,
    followUpPrompt: boundaryFollowUpPrompt(decision.boundary),
  };
}

export function answerSalonQuery(params: AnswerSalonQueryParams): SalonQaAnswer {
  const match = matchSalonQuery(params.question);
  const records = resolveBookRecordsSync(params.analysis, params.records);
  const boundaryContext = buildSalonQaBoundaryContext(params.analysis, records);
  const boundaryDecision = classifySalonQaBoundary(params.question, match, boundaryContext);

  if (boundaryDecision.boundary !== "in_bounds") {
    return buildBoundarySalonAnswer(params.question, boundaryDecision);
  }

  if (match.queryMode === "intelligence") {
    return answerIntelligenceQuery({
      question: params.question,
      match,
      records,
    });
  }

  if (match.queryMode === "client") {
    return answerClientQuery({
      question: params.question,
      match,
      analysis: params.analysis,
      records,
    });
  }

  return answerOpportunityQuery(params);
}

export { salonQaAnswerContainsForbiddenLanguage } from "./answer-opportunity-query";
