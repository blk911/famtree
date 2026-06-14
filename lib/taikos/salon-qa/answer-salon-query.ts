import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import type { VmbBookRecord } from "@/types/vmb/provider-ingest";
import { answerClientQuery } from "./answer-client-query";
import { answerIntelligenceQuery } from "./answer-intelligence-query";
import { answerOpportunityQuery } from "./answer-opportunity-query";
import { matchSalonQuery } from "./match-salon-query";
import { resolveBookRecordsSync } from "./resolve-book-records";
import type { SalonQaAnswer } from "./types";

export type AnswerSalonQueryParams = {
  question: string;
  analysis: VmbBookAnalysisResult;
  records?: VmbBookRecord[];
  ownerName?: string;
};

export function answerSalonQuery(params: AnswerSalonQueryParams): SalonQaAnswer {
  const match = matchSalonQuery(params.question);
  const records = resolveBookRecordsSync(params.analysis, params.records);

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
