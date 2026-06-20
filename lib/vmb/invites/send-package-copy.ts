import type { SalonInvitationApproval } from "@/types/vmb/salon-invitation-approval";

export type SendPackageCopy = {
  subjectLine: string;
  envelopeHeadline: string;
  envelopeBody: string;
  envelopeCtaLabel: string;
};

function providerFirstName(approval: SalonInvitationApproval): string {
  const name = approval.snapshot.ownerName?.trim();
  if (name) {
    const first = name.split(/\s+/)[0];
    if (first) return first;
  }
  return "Your stylist";
}

function normalizeOpportunityType(type: string): string {
  return type.trim().toLowerCase().replace(/[_-]+/g, " ");
}

function subjectForType(type: string, provider: string): string {
  const normalized = normalizeOpportunityType(type);
  if (normalized.includes("birthday")) {
    return `A birthday surprise from ${provider} is waiting 🎁`;
  }
  if (normalized === "pcn" || normalized.includes("private client")) {
    return `${provider} invited you into her private client network`;
  }
  if (normalized.includes("refresh") || normalized.includes("retention")) {
    return `${provider} saved a refresh option for you`;
  }
  if (
    normalized.includes("we miss you") ||
    normalized.includes("reactivation") ||
    normalized.includes("miss seeing")
  ) {
    return `${provider} misses seeing you`;
  }
  if (normalized.includes("referral")) {
    return `${provider} has something special for someone you care about`;
  }
  return `${provider} has something special waiting for you`;
}

export function buildSendPackageCopy(approval: SalonInvitationApproval): SendPackageCopy {
  const provider = providerFirstName(approval);
  return {
    subjectLine: subjectForType(approval.opportunityType, provider),
    envelopeHeadline: `You have a special message from ${provider}.`,
    envelopeBody: "Open your invitation to see your private offer and next steps.",
    envelopeCtaLabel: "Open My Invitation",
  };
}
