// lib/intelligence/transpo/action-queue/action-types.ts

export type TranspoActionDecision =
  | "unreviewed"
  | "investigate"
  | "partner"
  | "acquire"
  | "launch"
  | "watch"
  | "reject";

export type TranspoActionStatus =
  | "new"
  | "active"
  | "waiting"
  | "completed"
  | "closed";

export type TranspoActionQueueRecord = {
  id: string;
  county: string;
  state: string;
  serviceCategory: string;
  deficitScore: number;
  confidenceScore: number;
  actionabilityScore: number;
  severity: string;
  recommendedPlay: string;
  decision: TranspoActionDecision;
  status: TranspoActionStatus;
  notes?: string;
  providerCount?: number;
  payerName?: string;
  countyOpportunityId?: string;
  createdAt: string;
  updatedAt: string;
};

export type TranspoActionQueueSummary = {
  total: number;
  new: number;
  active: number;
  waiting: number;
  completed: number;
  rejected: number;
  immediateOpportunities: number;
  investigateCandidates: number;
  launchCandidates: number;
  acquireCandidates: number;
  partnerCandidates: number;
};

export type TranspoActionQueueQuestion = {
  id: string;
  question: string;
  answer: string;
};
