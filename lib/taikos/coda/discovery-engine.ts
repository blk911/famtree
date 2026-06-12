import type { ClientOpportunityRow } from "@/lib/vmb/client-opportunities";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import { actionLabelForRule } from "./action-engine";
import type { CodaActionLabel, TaikosObjective } from "./types";

export type DiscoveryHit = {
  ruleId: string;
  row: ClientOpportunityRow;
  subjectLabel: string;
  discovery: string;
  curiosityPrompt: string;
  suggestedAction: CodaActionLabel;
  confidence: number;
};

function firstName(clientName: string): string {
  return clientName.trim().split(/\s+/)[0] || clientName;
}

function daysFromTrigger(trigger: string): number | null {
  const match = trigger.match(/(\d+)\s+days?\s+inactive/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

function visitCountFromRow(row: ClientOpportunityRow): number {
  const match = row.lastService?.match(/(\d+)\s+visits?/i);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function isBridalOrWedding(row: ClientOpportunityRow): boolean {
  const hay = `${row.trigger} ${row.lastService ?? ""} ${row.opportunityType}`.toLowerCase();
  return row.triggerType === "Bridal Client" || hay.includes("bridal") || hay.includes("wedding");
}

function isColorService(text: string): boolean {
  return /balayage|color|gloss|highlight|root touch/i.test(text);
}

function serviceHintForClient(analysis: VmbBookAnalysisResult | undefined, clientName: string): string {
  if (!analysis) return "";
  const key = clientName.trim().toLowerCase();
  const opps = [
    ...analysis.giftOpportunities,
    ...analysis.reactivationTargets,
    ...analysis.referralOpportunities,
  ];
  for (const opp of opps) {
    if (opp.clientName.trim().toLowerCase() !== key) continue;
    const match = opp.summary.match(/Service "([^"]+)"/i);
    if (match) return match[1];
  }
  return "";
}

function daysFromSummary(analysis: VmbBookAnalysisResult | undefined, clientName: string): number | null {
  if (!analysis) return null;
  const key = clientName.trim().toLowerCase();
  const opp = analysis.reactivationTargets.find((o) => o.clientName.trim().toLowerCase() === key);
  if (!opp) return null;
  const match = opp.summary.match(/(\d+)\s+days?\s+ago/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

export function runDiscoveryEngine(
  rows: ClientOpportunityRow[],
  objective: TaikosObjective,
  analysis?: VmbBookAnalysisResult,
): DiscoveryHit[] {
  const hits: DiscoveryHit[] = [];
  const seen = new Set<string>();

  function push(hit: DiscoveryHit) {
    const key = `${hit.ruleId}:${hit.row.clientName.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    hits.push(hit);
  }

  for (const row of rows) {
    const name = firstName(row.clientName);
    const days = daysFromTrigger(row.trigger) ?? daysFromSummary(analysis, row.clientName);
    const serviceHint = row.lastService ?? serviceHintForClient(analysis, row.clientName);
    const serviceText = `${serviceHint} ${row.trigger} ${row.opportunityType}`;

    if (isBridalOrWedding(row) && days !== null && days >= 270) {
      push({
        ruleId: "wedding-lapsed",
        row,
        subjectLabel: "Wedding Client",
        discovery: `You haven't seen ${name} since her wedding season.`,
        curiosityPrompt: "Many wedding clients disappear after the event. Would you like to reconnect?",
        suggestedAction: actionLabelForRule("wedding-lapsed"),
        confidence: 82,
      });
    }

    if (isColorService(serviceText) && days !== null && days >= 35 && days <= 120) {
      push({
        ruleId: "color-refresh",
        row,
        subjectLabel: "Color Client",
        discovery: `Refresh timing window detected for ${name}.`,
        curiosityPrompt: "Color clients often respond best before fading becomes noticeable.",
        suggestedAction: actionLabelForRule("color-refresh"),
        confidence: 78,
      });
    }

    const visits = visitCountFromRow(row);
    if (
      (row.triggerType === "Referral" || row.triggerType === "VIP" || row.triggerType === "Frequent Visitor") &&
      visits >= 3
    ) {
      push({
        ruleId: "influential-referrer",
        row,
        subjectLabel: visits >= 5 ? "VIP Client" : "Influential Client",
        discovery: `Influential client detected — ${name} appears to bring others.`,
        curiosityPrompt: "This client may be a strong ambassador for your salon.",
        suggestedAction: actionLabelForRule("influential-referrer"),
        confidence: visits >= 5 ? 88 : 76,
      });
    }

    if (row.triggerType === "Birthday") {
      push({
        ruleId: "birthday-upcoming",
        row,
        subjectLabel: "Birthday Client",
        discovery: `${name} has a birthday moment on the calendar.`,
        curiosityPrompt: "Birthday touches often reopen booking conversations.",
        suggestedAction: actionLabelForRule("birthday-upcoming"),
        confidence: 74,
      });
    }

    if (row.triggerType === "Reactivation" || row.triggerType === "Lapsed") {
      if (days !== null && days >= 90) {
        push({
          ruleId: "reactivation-window",
          row,
          subjectLabel: row.triggerType === "Lapsed" ? "Lapsed Client" : "Past Client",
          discovery: `${name} has been away for ${days} days.`,
          curiosityPrompt: "A personal reactivation invite can bring loyal clients back.",
          suggestedAction: actionLabelForRule("reactivation-window"),
          confidence: days >= 180 ? 85 : 72,
        });
      }
    }

    if (row.triggerType === "Referral" && row.confidence === "high") {
      push({
        ruleId: "referral-ready",
        row,
        subjectLabel: "Referral Client",
        discovery: `${name} is a strong referral candidate.`,
        curiosityPrompt: "Would you like to ask for a trusted intro?",
        suggestedAction: actionLabelForRule("referral-ready"),
        confidence: 80,
      });
    }
  }

  void objective;

  return hits.sort((a, b) => b.confidence - a.confidence);
}
