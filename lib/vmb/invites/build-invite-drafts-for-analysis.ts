import { buildNewClientSummary } from "@/lib/vmb/operating-system/new-clients";
import { buildWeeklyRevenueSummary } from "@/lib/vmb/operating-system/weekly-revenue";
import { getTopNetworkCandidates } from "@/lib/vmb/invite-drafts/build-invite-drafts";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import type { InviteDraftCategory, VmbInviteDraft } from "@/types/vmb/invite-draft";
import { stableInviteDraftId } from "./draft-keys";

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

function lockedFooter(salonName: string): string {
  return `\n\nSent from VMB on behalf of ${salonName}\nPrivate client network · Reply links coming soon.`;
}

function baseDraft(
  analysis: VmbBookAnalysisResult,
  trialId: string,
  clientName: string,
  inviteCategory: InviteDraftCategory,
  fields: Pick<
    VmbInviteDraft,
    "reasonSelected" | "potentialValue" | "subject" | "editableMessage" | "email" | "phone" | "candidateScore"
  >,
): VmbInviteDraft {
  const salonName = analysis.salonName?.trim() || "Your Salon";
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
    lockedFooter: lockedFooter(salonName),
    candidateScore: fields.candidateScore,
    createdAt: now,
    updatedAt: now,
  };
}

function buildNetworkDrafts(analysis: VmbBookAnalysisResult, trialId: string): VmbInviteDraft[] {
  const salonName = analysis.salonName?.trim() || "Your Salon";
  return getTopNetworkCandidates(analysis, 10).map((candidate) =>
    baseDraft(analysis, trialId, candidate.clientName, "private_client_network", {
      reasonSelected: candidate.reasonSelected,
      potentialValue: candidate.potentialValue,
      subject: `You're invited to ${salonName}'s private client network`,
      editableMessage: `Hi ${firstName(candidate.clientName)},

We've been building something special for our favorite clients — a private network where you get first access to openings, member-only offers, and a direct line to us.

We'd love to invite you in this week. Reply YES and we'll send your personal link.

Thank you for being part of ${salonName}.`,
      email: candidate.email,
      phone: candidate.phone,
      candidateScore: candidate.candidateScore,
    }),
  );
}

function buildWelcomeDrafts(analysis: VmbBookAnalysisResult, trialId: string): VmbInviteDraft[] {
  const salonName = analysis.salonName?.trim() || "Your Salon";
  const summary = buildNewClientSummary(analysis);
  return summary.rows.slice(0, 8).map((row) =>
    baseDraft(analysis, trialId, row.clientName, "new_client_welcome", {
      reasonSelected: "New client · welcome ready",
      potentialValue: 75,
      subject: `Welcome to ${salonName}`,
      editableMessage: `${row.welcomeMessage}

We'd love to stay connected — reply if you'd like your private client link.`,
      candidateScore: 0,
    }),
  );
}

function buildRevenueDrafts(analysis: VmbBookAnalysisResult, trialId: string): VmbInviteDraft[] {
  const salonName = analysis.salonName?.trim() || "Your Salon";
  const revenue = buildWeeklyRevenueSummary(analysis);
  return revenue.opportunities.slice(0, 12).map((opp) =>
    baseDraft(analysis, trialId, opp.clientName, "revenue_touch", {
      reasonSelected: `${opp.reason} · ${opp.suggestedAction}`,
      potentialValue: opp.potentialRevenue,
      subject: `${opp.suggestedAction} — ${salonName}`,
      editableMessage: `Hi ${firstName(opp.clientName)},

We noticed ${opp.reason.toLowerCase()} and wanted to reach out with a personal invite.

${opp.suggestedAction} — reply if you'd like us to hold a spot for you.

— ${salonName}`,
      candidateScore: 0,
    }),
  );
}

function buildTrustedIntroDrafts(analysis: VmbBookAnalysisResult, trialId: string): VmbInviteDraft[] {
  const salonName = analysis.salonName?.trim() || "Your Salon";
  return analysis.trustedProviderIntroOpportunities.slice(0, 6).map((opp) =>
    baseDraft(analysis, trialId, opp.clientName, "trusted_intro_request", {
      reasonSelected: `Trusted intro · ${opp.introCategory}`,
      potentialValue: 120,
      subject: `Quick intro request — ${salonName}`,
      editableMessage: `Hi ${firstName(opp.clientName)},

${opp.promptText}

Reply if you're open to a warm introduction this week.`,
      candidateScore: 0,
    }),
  );
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
