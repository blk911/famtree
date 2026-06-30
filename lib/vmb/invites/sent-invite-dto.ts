import type { ClientInviteBookingRequest, ClientInviteIntent, InviteClaim, SalonClaimTimelineItem, SentInvite } from "./sent-invite-types";

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

export type ClientBookingRequestDto = {
  id: string;
  kind: ClientInviteIntent["kind"];
  bookingStatus?: ClientInviteBookingRequest["bookingStatus"];
  requestedSlot?: string;
  note?: string;
  createdAt: string;
  serviceLine?: string;
  selectedLevelUps?: ClientInviteBookingRequest["selectedLevelUps"];
  subtotal?: number;
  tax?: number;
  vmbComarket?: number;
  total?: number;
  paymentStatus?: ClientInviteBookingRequest["paymentStatus"];
};

export type SalonClaimTimelineDto = {
  sentInvite: SentInviteSummaryDto;
  claim?: InviteClaimSummaryDto;
  bookingRequest?: ClientBookingRequestDto;
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

function toBookingRequestDto(intent: ClientInviteIntent): ClientBookingRequestDto {
  return {
    id: intent.id,
    kind: intent.kind,
    bookingStatus: intent.booking?.bookingStatus ?? "booking_requested",
    requestedSlot: intent.requestedSlot,
    note: intent.note,
    createdAt: intent.createdAt,
    serviceLine: intent.booking?.serviceLine,
    selectedLevelUps: intent.booking?.selectedLevelUps,
    subtotal: intent.booking?.subtotal,
    tax: intent.booking?.tax,
    vmbComarket: intent.booking?.vmbComarket,
    total: intent.booking?.total,
    paymentStatus: intent.booking?.paymentStatus,
  };
}

export function toSalonClaimTimelineDto(row: SalonClaimTimelineItem): SalonClaimTimelineDto {
  return {
    sentInvite: toSentInviteSummaryDto(row.sentInvite),
    claim: row.claim ? toClaimSummaryDto(row.claim) : undefined,
    bookingRequest: row.bookingRequest ? toBookingRequestDto(row.bookingRequest) : undefined,
  };
}
