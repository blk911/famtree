/**
 * npm run test:vmb:isolation
 * Verifies VMB trial scoping helpers and nav persistence.
 */
import type { VmbBookAnalysisResult } from "../types/vmb/book-analysis";
import type { TrustedProviderIntroRequest } from "../types/vmb/trusted-circle";
import {
  analysisBelongsToTrial,
  appendVmbAnalysisQuery,
  filterAnalysesForTrial,
  filterIntrosForTrial,
  latestAnalysisForTrial,
} from "../lib/vmb/trial-scope";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

const trialA = "vmb-trial-a";
const trialB = "vmb-trial-b";

const analysisA: VmbBookAnalysisResult = {
  analysisId: "analysis-a",
  trialId: trialA,
  recordCount: 10,
  reactivationTargets: [],
  referralOpportunities: [],
  giftOpportunities: [],
  trustedProviderIntroOpportunities: [],
  estimatedRecoverableRevenue: 1000,
  generatedAt: new Date().toISOString(),
};

const analysisB: VmbBookAnalysisResult = {
  ...analysisA,
  analysisId: "analysis-b",
  trialId: trialB,
};

const allAnalyses = [analysisB, analysisA];

assert(
  !analysisBelongsToTrial(analysisB, trialA),
  "trial A cannot read trial B analysis by id",
);
assert(
  analysisBelongsToTrial(analysisA, trialA),
  "trial A can read its own analysis",
);
assert(
  latestAnalysisForTrial(allAnalyses, trialA)?.analysisId === "analysis-a",
  "latest analysis for trial A is scoped correctly",
);
assert(
  filterAnalysesForTrial(allAnalyses, trialB).length === 1,
  "trial B only sees one analysis",
);

const introA: TrustedProviderIntroRequest = {
  requestId: "intro-a",
  trialId: trialA,
  clientName: "Alex",
  requestedCategory: "Nails",
  messageDraft: "draft",
  status: "draft",
  createdAt: new Date().toISOString(),
};

const introB: TrustedProviderIntroRequest = {
  ...introA,
  requestId: "intro-b",
  trialId: trialB,
  clientName: "Blair",
};

const intros = [introB, introA];
assert(
  filterIntrosForTrial(intros, trialA).every((r) => r.trialId === trialA),
  "trial A cannot list trial B intros",
);
assert(filterIntrosForTrial(intros, trialA).length === 1, "trial A sees one intro");

assert(
  latestAnalysisForTrial([], trialA) === undefined,
  "no-cookie/no-data scope returns no analysis",
);

const clientsHref = appendVmbAnalysisQuery("/vmb/clients", "analysis-a");
assert(
  clientsHref === "/vmb/clients?analysis=analysis-a",
  "dashboard links preserve analysis id",
);
assert(
  appendVmbAnalysisQuery("/vmb/network?foo=1", "analysis-a") === "/vmb/network?foo=1&analysis=analysis-a",
  "analysis param merges with existing query",
);
assert(
  appendVmbAnalysisQuery("/vmb/dashboard", undefined) === "/vmb/dashboard",
  "links without active analysis stay unchanged",
);

console.log("OK test:vmb:isolation");
