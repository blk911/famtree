// lib/intelligence/transpo/action-queue/action-summary.ts

import type {
  TranspoActionQueueQuestion,
  TranspoActionQueueRecord,
  TranspoActionQueueSummary,
} from "./action-types";

export function buildActionQueueSummary(
  records: TranspoActionQueueRecord[],
): TranspoActionQueueSummary {
  const open = records.filter((r) => r.status !== "closed");
  return {
    total: open.length,
    new: open.filter((r) => r.status === "new").length,
    active: open.filter((r) => r.status === "active").length,
    waiting: open.filter((r) => r.status === "waiting").length,
    completed: open.filter((r) => r.status === "completed").length,
    rejected: open.filter((r) => r.decision === "reject").length,
    immediateOpportunities: open.filter((r) => r.actionabilityScore >= 75).length,
    investigateCandidates: open.filter((r) => r.decision === "investigate").length,
    launchCandidates: open.filter((r) => r.decision === "launch").length,
    acquireCandidates: open.filter((r) => r.decision === "acquire").length,
    partnerCandidates: open.filter((r) => r.decision === "partner").length,
  };
}

export function buildActionQueueQuestions(
  records: TranspoActionQueueRecord[],
  summary: TranspoActionQueueSummary,
): TranspoActionQueueQuestion[] {
  const open = records.filter((r) => r.status !== "closed");
  const topCounties = [...open]
    .sort((a, b) => b.actionabilityScore - a.actionabilityScore)
    .slice(0, 5)
    .map((r) => `${r.county}, ${r.state} (${r.actionabilityScore})`)
    .join("; ");

  return [
    {
      id: "Q1",
      question: "How many opportunities are being investigated?",
      answer:
        summary.investigateCandidates > 0
          ? `${summary.investigateCandidates} with decision=investigate; ${summary.active} active overall.`
          : "None flagged investigate yet — promote from Opportunity Radar to start.",
    },
    {
      id: "Q2",
      question: "How many are launch candidates?",
      answer: `${summary.launchCandidates} with decision=launch.`,
    },
    {
      id: "Q3",
      question: "How many are acquisition candidates?",
      answer: `${summary.acquireCandidates} with decision=acquire.`,
    },
    {
      id: "Q4",
      question: "How many are partnership candidates?",
      answer: `${summary.partnerCandidates} with decision=partner.`,
    },
    {
      id: "Q5",
      question: "Which counties have the highest actionability?",
      answer: topCounties || "No open queue records — promote county opportunities first.",
    },
    {
      id: "Q6",
      question: "Which opportunities are waiting on data?",
      answer: `${summary.waiting} with status=waiting (blocked on verification, payer, or provider data).`,
    },
    {
      id: "Q7",
      question: "Which opportunities have been completed?",
      answer: `${summary.completed} with status=completed.`,
    },
    {
      id: "Q8",
      question: "Which opportunities were rejected?",
      answer: `${summary.rejected} with decision=reject.`,
    },
  ];
}
