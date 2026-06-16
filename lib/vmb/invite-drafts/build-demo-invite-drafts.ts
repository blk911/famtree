import crypto from "crypto";
import { buildOutreachDraftCopy } from "@/lib/vmb/invites/outreach-message-presets";
import { getTopNetworkCandidates } from "@/lib/vmb/invite-drafts/network-candidates";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import type { VmbInviteDraft } from "@/types/vmb/invite-draft";

/** Client-safe demo drafts — canonical presets only (no salon store). */
export function buildDemoInviteDraftRecords(
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
