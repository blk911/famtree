import type { CodaSummary, TaikosInsight } from "@/lib/taikos/coda/types";
import type { OpportunityIntelligence } from "@/lib/vmb/opportunities/opportunity-intelligence";

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export function stripInternalLabels(text: string): string {
  return text
    .replace(/^(OBJECTIVE|DISCOVERY|CURIOSITY|SUGGESTED ACTION|SUGGESTED ACTION):\s*/i, "")
    .trim();
}

export function timeOfDayPeriod(): "Morning" | "Afternoon" | "Evening" {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 22) return "Evening";
  return "Evening";
}

export function buildTodayGreeting(operatorName?: string, salonName = "there"): string {
  const period = timeOfDayPeriod();
  const who = operatorName?.trim() ? firstName(operatorName) : firstName(salonName);
  const emoji = period === "Morning" ? " ☀️" : "";
  return `Good ${period} ${who}${emoji}`;
}

const FALLBACK_CONVERSATION = [
  "I did not see an urgent relationship signal yet.",
  "We can still fill open slots or find clients who may be due.",
  "Would you like me to build a candidate list?",
] as const;

export function buildTodayConversationLines(coda: CodaSummary): string[] {
  const insights = coda.insights ?? [];
  if (insights.length === 0) return [...FALLBACK_CONVERSATION];

  const first = insights[0];
  const observation = stripInternalLabels(first.discovery);
  const curiosity = stripInternalLabels(first.curiosityPrompt);
  const question = curiosity.includes("?")
    ? curiosity
    : `Would you like to ${humanizeSuggestedAction(first.suggestedAction)}?`;
  const suggestion = curiosity.includes("?")
    ? curiosity.replace(/\?\s*$/, ".")
    : curiosity.endsWith(".")
      ? curiosity
      : `${curiosity}.`;

  const lines = [observation];
  if (suggestion && suggestion !== observation) lines.push(suggestion);
  lines.push(question);
  return lines.slice(0, 3);
}

function humanizeSuggestedAction(action: string): string {
  const lower = action.toLowerCase();
  if (lower.includes("pcn") || lower.includes("invite")) return "invite this client into your Private Client Network";
  if (lower.includes("referral")) return "explore a referral opportunity here";
  if (lower.includes("refresh")) return "send a refresh invite";
  if (lower.includes("vip")) return "send a VIP thank-you";
  if (lower.includes("birthday")) return "prepare a birthday note";
  if (lower.includes("reactivation")) return "reconnect with this client";
  return "take the next step together";
}

export function buildInsightGuideCopy(insight: TaikosInsight): {
  bodyLines: string[];
  suggestedNextStep: string;
} {
  const discovery = stripInternalLabels(insight.discovery);
  const curiosity = stripInternalLabels(insight.curiosityPrompt);
  const secondLine = curiosity.endsWith("?")
    ? curiosity.replace(/\?\s*$/, ".")
    : curiosity;
  return {
    bodyLines: [discovery, secondLine].filter(Boolean).slice(0, 2),
    suggestedNextStep: stripInternalLabels(insight.suggestedAction),
  };
}

export function buildOpportunityGuideCopy(
  intelligence: OpportunityIntelligence,
  clientName: string,
  roleLabel?: string,
): {
  bodyLines: string[];
  suggestedNextStep: string;
  roleLabel: string;
} {
  const name = firstName(clientName);
  let nextStep = intelligence.suggestedRelationshipMove;
  if (name !== "Friend" && /\bher\b/i.test(nextStep)) {
    nextStep = nextStep.replace(/\bher\b/i, name);
  }
  return {
    roleLabel: roleLabel ?? humanizeRole(intelligence.insightTitle),
    bodyLines: [intelligence.whatTaikosSees, intelligence.whyThisMatters].filter(Boolean).slice(0, 2),
    suggestedNextStep: nextStep,
  };
}

function humanizeRole(title: string): string {
  const map: Record<string, string> = {
    "Refresh window opening": "Due for refresh",
    "Reactivation opportunity": "Past client",
    "Relationship amplifier": "VIP Client",
    "High-value relationship": "VIP Client",
    "Date-based moment": "Celebration",
    "Perishable chair time": "Open slot match",
    "Relationship move detected": "Client opportunity",
  };
  return map[title] ?? title;
}

export function relationshipOpportunityCount(coda: CodaSummary): number {
  return Math.max(coda.opportunityCount ?? 0, coda.insightCount ?? 0, coda.insights?.length ?? 0);
}
