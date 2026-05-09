// AIH Safe Core Graph — foundational contract only. No persistence, no UI, no permissions.
//
// AIH Safe invite lifecycle states.
// These are domain-level states, NOT a direct mirror of the Prisma InviteStatus enum.
// The mapping to Prisma InviteStatus is the responsibility of lib/aihsafe/invites/.
//
// Mapping reference (for invites service implementor):
//   DRAFT / SENT   ← Prisma: PENDING
//   VIEWED         ← Prisma: PENDING (with interaction signal)
//   ACCEPTED       ← Prisma: ACCEPTED
//   DECLINED       ← Prisma: EXPIRED (no Prisma equivalent for explicit decline)
//   EXPIRED        ← Prisma: EXPIRED
//   REVOKED        ← Prisma: CANCELLED

export const AIHInviteState = {
  DRAFT:    "draft",    // invite created, not yet sent to recipient
  SENT:     "sent",     // delivered to recipient (email dispatched)
  VIEWED:   "viewed",   // recipient opened the invite link
  ACCEPTED: "accepted", // identity challenge passed; registration may proceed
  DECLINED: "declined", // recipient explicitly declined
  EXPIRED:  "expired",  // time or attempt limit exhausted
  REVOKED:  "revoked",  // sender or guardian cancelled before acceptance
} as const;
export type AIHInviteState = (typeof AIHInviteState)[keyof typeof AIHInviteState];

// Terminal states — invite cannot transition further.
export const TERMINAL_INVITE_STATES: readonly AIHInviteState[] = [
  AIHInviteState.ACCEPTED,
  AIHInviteState.DECLINED,
  AIHInviteState.EXPIRED,
  AIHInviteState.REVOKED,
] as const;

// States visible to the recipient.
export const RECIPIENT_VISIBLE_STATES: readonly AIHInviteState[] = [
  AIHInviteState.SENT,
  AIHInviteState.VIEWED,
  AIHInviteState.ACCEPTED,
  AIHInviteState.DECLINED,
  AIHInviteState.EXPIRED,
] as const;

export const isTerminalInviteState = (state: AIHInviteState): boolean =>
  (TERMINAL_INVITE_STATES as readonly string[]).includes(state);
