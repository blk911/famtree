import crypto from "crypto";
import {
  extractClientPool,
  recencyScore,
  spendScoreFromValue,
} from "@/lib/vmb/operating-system/client-pool";
import { buildOutreachDraftCopy } from "@/lib/vmb/invites/outreach-message-presets";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import type { VmbInviteDraft } from "@/types/vmb/invite-draft";

export type NetworkCandidateWithMeta = {
  clientName: string;
  candidateScore: number;
  visitCount: number;
  recencyScore: number;
  spendScore: number;
  potentialValue: number;
  reasonSelected: string;
  email?: string;
  phone?: string;
};

function bestOpportunityValue(analysis: VmbBookAnalysisResult, clientName: string): number {
  const key = clientName.trim().toLowerCase();
  const opps = [
    ...analysis.referralOpportunities,
    ...analysis.reactivationTargets,
    ...analysis.giftOpportunities,
  ];
  const match = opps.find((o) => o.clientName.trim().toLowerCase() === key);
  return match?.estimatedValue ?? 85;
}

function reasonForCandidate(meta: Omit<NetworkCandidateWithMeta, "email" | "phone">): string {
  if (meta.visitCount >= 5) return `${meta.visitCount} visits · VIP client`;
  if (meta.visitCount >= 3) return `${meta.visitCount} visits · repeat client`;
  if (meta.recencyScore >= 8) return "Recent visit · high engagement";
  if (meta.recencyScore <= 2) return "Strong history · ready to reconnect";
  return `Network score ${meta.candidateScore}`;
}

export function getTopNetworkCandidates(
  analysis: VmbBookAnalysisResult,
  limit = 10,
): NetworkCandidateWithMeta[] {
  const pool = extractClientPool(analysis);
  const scored = pool
    .map((entry) => {
      const recencyPart = recencyScore(entry.daysInactive);
      const spendPart = entry.spendScore || spendScoreFromValue(entry.spendScore * 25);
      const candidateScore = entry.visitCount + recencyPart + spendPart;
      const base = {
        clientName: entry.clientName,
        candidateScore,
        visitCount: entry.visitCount,
        recencyScore: recencyPart,
        spendScore: spendPart,
        potentialValue: bestOpportunityValue(analysis, entry.clientName),
        reasonSelected: "",
      };
      return {
        ...base,
        reasonSelected: reasonForCandidate(base),
      };
    })
    .sort((a, b) => b.candidateScore - a.candidateScore);

  return scored.slice(0, limit);
}

export function buildInviteDraftRecords(
  analysis: VmbBookAnalysisResult,
  trialId: string,
): VmbInviteDraft[] {
  const salonName = analysis.salonName?.trim() || "Your Salon";
  const now = new Date().toISOString();
  const candidates = getTopNetworkCandidates(analysis, 10);

  return candidates.map((candidate, index) => {
    const copy = buildOutreachDraftCopy("private_client_network", {
      salonName,
      clientName: candidate.clientName,
    });

    return {
      draftId: `invite-${analysis.analysisId}-${index}-${crypto.randomBytes(3).toString("hex")}`,
      trialId,
      analysisId: analysis.analysisId,
      clientName: candidate.clientName,
      email: candidate.email,
      phone: candidate.phone,
      reasonSelected: candidate.reasonSelected,
      inviteCategory: "private_client_network" as const,
      inviteType: "private_client_network" as const,
      potentialValue: candidate.potentialValue,
      status: "draft" as const,
      subject: copy.subject,
      editableMessage: copy.editableMessage,
      lockedFooter: copy.lockedFooter,
      candidateScore: candidate.candidateScore,
      createdAt: now,
      updatedAt: now,
    };
  });
}
