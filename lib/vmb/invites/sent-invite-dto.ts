import type { InviteClaim, SalonClaimTimelineItem, SentInvite } from "./sent-invite-types";

export type SentInviteSummaryDto = {
  id: string;
  status: SentInvite["status"];
  recipientName: string;
  inviteTypeLabel: string;
  sentAt: string;
  expiresAt: string;
  openedAt?: string;
  claimedAt?: string;
  redeemedAt?: string;
};

export type InviteClaimSummaryDto = {
  clientName: string;
  recipientContactSummary: string;
  claimedAt: string;
};

export type SalonClaimTimelineDto = {
  sentInvite: SentInviteSummaryDto;
  claim?: InviteClaimSummaryDto;
};

export function toSentInviteSummaryDto(invite: SentInvite): SentInviteSummaryDto {
  return {
    id: invite.id,
    status: invite.status,
    recipientName: invite.snapshot.recipientName,
    inviteTypeLabel: invite.snapshot.inviteTypeLabel,
    sentAt: invite.sentAt,
    expiresAt: invite.expiresAt,
    openedAt: invite.openedAt,
    claimedAt: invite.claimedAt,
    redeemedAt: invite.redeemedAt,
  };
}

function toClaimSummaryDto(claim: InviteClaim): InviteClaimSummaryDto {
  return {
    clientName: claim.clientName,
    recipientContactSummary: claim.recipientContactSummary,
    claimedAt: claim.claimedAt,
  };
}

export function toSalonClaimTimelineDto(row: SalonClaimTimelineItem): SalonClaimTimelineDto {
  return {
    sentInvite: toSentInviteSummaryDto(row.sentInvite),
    claim: row.claim ? toClaimSummaryDto(row.claim) : undefined,
  };
}
