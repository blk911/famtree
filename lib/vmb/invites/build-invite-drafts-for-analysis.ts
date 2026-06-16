import { buildNewClientSummary } from "@/lib/vmb/operating-system/new-clients";
import { buildWeeklyRevenueSummary } from "@/lib/vmb/operating-system/weekly-revenue";
import { getTopNetworkCandidates } from "@/lib/vmb/invite-drafts/build-invite-drafts";
import { buildOutreachDraftCopy } from "@/lib/vmb/invites/outreach-message-presets";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import type { InviteDraftCategory, VmbInviteDraft } from "@/types/vmb/invite-draft";
import { stableInviteDraftId } from "./draft-keys";

function baseDraft(
  analysis: VmbBookAnalysisResult,
  trialId: string,
  clientName: string,
  inviteCategory: InviteDraftCategory,
  fields: Pick<
    VmbInviteDraft,
    "reasonSelected" | "potentialValue" | "subject" | "editableMessage" | "email" | "phone" | "candidateScore"
  > & { lockedFooter: string },
): VmbInviteDraft {
  const now = new Date().toISOString();
  return {
    draftId: stableInviteDraftId(trialId, analysis.analysisId, clientName, inviteCategory),
    trialId,
    analysisId: analysis.analysisId,
    clientName,
    email: fields.email,
    phone: fields.phone,
    reasonSelected: fields.reasonSelected,
    inviteCategory,
    inviteType: inviteCategory === "private_client_network" ? "private_client_network" : undefined,
    potentialValue: fields.potentialValue,
    status: "draft",
    subject: fields.subject,
    editableMessage: fields.editableMessage,
    lockedFooter: fields.lockedFooter,
    candidateScore: fields.candidateScore,
    createdAt: now,
    updatedAt: now,
  };
}

function buildNetworkDrafts(analysis: VmbBookAnalysisResult, trialId: string): VmbInviteDraft[] {
  const salonName = analysis.salonName?.trim() || "Your Salon";
  return getTopNetworkCandidates(analysis, 10).map((candidate) => {
    const copy = buildOutreachDraftCopy("private_client_network", {
      salonName,
      clientName: candidate.clientName,
    });
    return baseDraft(analysis, trialId, candidate.clientName, "private_client_network", {
      reasonSelected: candidate.reasonSelected,
      potentialValue: candidate.potentialValue,
      subject: copy.subject,
      editableMessage: copy.editableMessage,
      lockedFooter: copy.lockedFooter,
      email: candidate.email,
      phone: candidate.phone,
      candidateScore: candidate.candidateScore,
    });
  });
}

function buildWelcomeDrafts(analysis: VmbBookAnalysisResult, trialId: string): VmbInviteDraft[] {
  const salonName = analysis.salonName?.trim() || "Your Salon";
  const summary = buildNewClientSummary(analysis);
  return summary.rows.slice(0, 8).map((row) => {
    const copy = buildOutreachDraftCopy("new_client_welcome", {
      salonName,
      clientName: row.clientName,
      welcomeMessage: row.welcomeMessage,
    });
    return baseDraft(analysis, trialId, row.clientName, "new_client_welcome", {
      reasonSelected: "New client · welcome ready",
      potentialValue: 75,
      subject: copy.subject,
      editableMessage: copy.editableMessage,
      lockedFooter: copy.lockedFooter,
      candidateScore: 0,
    });
  });
}

function buildRevenueDrafts(analysis: VmbBookAnalysisResult, trialId: string): VmbInviteDraft[] {
  const salonName = analysis.salonName?.trim() || "Your Salon";
  const revenue = buildWeeklyRevenueSummary(analysis);
  return revenue.opportunities.slice(0, 12).map((opp) => {
    const copy = buildOutreachDraftCopy("revenue_touch", {
      salonName,
      clientName: opp.clientName,
      reason: opp.reason,
      suggestedAction: opp.suggestedAction,
    });
    return baseDraft(analysis, trialId, opp.clientName, "revenue_touch", {
      reasonSelected: `${opp.reason} · ${opp.suggestedAction}`,
      potentialValue: opp.potentialRevenue,
      subject: copy.subject,
      editableMessage: copy.editableMessage,
      lockedFooter: copy.lockedFooter,
      candidateScore: 0,
    });
  });
}

function buildTrustedIntroDrafts(analysis: VmbBookAnalysisResult, trialId: string): VmbInviteDraft[] {
  const salonName = analysis.salonName?.trim() || "Your Salon";
  return analysis.trustedProviderIntroOpportunities.slice(0, 6).map((opp) => {
    const copy = buildOutreachDraftCopy("trusted_intro_request", {
      salonName,
      clientName: opp.clientName,
      promptText: opp.promptText,
    });
    return baseDraft(analysis, trialId, opp.clientName, "trusted_intro_request", {
      reasonSelected: `Trusted intro · ${opp.introCategory}`,
      potentialValue: 120,
      subject: copy.subject,
      editableMessage: copy.editableMessage,
      lockedFooter: copy.lockedFooter,
      candidateScore: 0,
    });
  });
}

/** Build all invite draft categories from one analysis — stable ids, no random suffixes. */
export function buildInviteDraftsForAnalysis(
  analysis: VmbBookAnalysisResult,
  trialId: string,
): VmbInviteDraft[] {
  return [
    ...buildNetworkDrafts(analysis, trialId),
    ...buildWelcomeDrafts(analysis, trialId),
    ...buildRevenueDrafts(analysis, trialId),
    ...buildTrustedIntroDrafts(analysis, trialId),
  ];
}
