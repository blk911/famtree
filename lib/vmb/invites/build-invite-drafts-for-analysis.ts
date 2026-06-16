import { buildNewClientSummary } from "@/lib/vmb/operating-system/new-clients";
import { buildWeeklyRevenueSummary } from "@/lib/vmb/operating-system/weekly-revenue";
import { getTopNetworkCandidates } from "@/lib/vmb/invite-drafts/network-candidates";
import { buildOutreachDraftCopyForSalon } from "@/lib/vmb/invites/outreach-preset-store";
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

async function buildNetworkDrafts(analysis: VmbBookAnalysisResult, trialId: string): Promise<VmbInviteDraft[]> {
  const salonName = analysis.salonName?.trim() || "Your Salon";
  return Promise.all(
    getTopNetworkCandidates(analysis, 10).map(async (candidate) => {
      const copy = await buildOutreachDraftCopyForSalon(trialId, "private_client_network", {
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
    }),
  );
}

async function buildWelcomeDrafts(analysis: VmbBookAnalysisResult, trialId: string): Promise<VmbInviteDraft[]> {
  const salonName = analysis.salonName?.trim() || "Your Salon";
  const summary = buildNewClientSummary(analysis);
  return Promise.all(
    summary.rows.slice(0, 8).map(async (row) => {
      const copy = await buildOutreachDraftCopyForSalon(trialId, "new_client_welcome", {
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
    }),
  );
}

async function buildRevenueDrafts(analysis: VmbBookAnalysisResult, trialId: string): Promise<VmbInviteDraft[]> {
  const salonName = analysis.salonName?.trim() || "Your Salon";
  const revenue = buildWeeklyRevenueSummary(analysis);
  return Promise.all(
    revenue.opportunities.slice(0, 12).map(async (opp) => {
      const copy = await buildOutreachDraftCopyForSalon(trialId, "revenue_touch", {
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
    }),
  );
}

async function buildTrustedIntroDrafts(
  analysis: VmbBookAnalysisResult,
  trialId: string,
): Promise<VmbInviteDraft[]> {
  const salonName = analysis.salonName?.trim() || "Your Salon";
  return Promise.all(
    analysis.trustedProviderIntroOpportunities.slice(0, 6).map(async (opp) => {
      const copy = await buildOutreachDraftCopyForSalon(trialId, "trusted_intro_request", {
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
    }),
  );
}

/** Build all invite draft categories from one analysis — stable ids, no random suffixes. */
export async function buildInviteDraftsForAnalysis(
  analysis: VmbBookAnalysisResult,
  trialId: string,
): Promise<VmbInviteDraft[]> {
  const [network, welcome, revenue, trustedIntro] = await Promise.all([
    buildNetworkDrafts(analysis, trialId),
    buildWelcomeDrafts(analysis, trialId),
    buildRevenueDrafts(analysis, trialId),
    buildTrustedIntroDrafts(analysis, trialId),
  ]);
  return [...network, ...welcome, ...revenue, ...trustedIntro];
}
