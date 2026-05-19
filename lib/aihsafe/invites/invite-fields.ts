// Persisted invite intent fields — shared between create + materialize.

import type { Invite } from "@prisma/client";
import {
  defaultRelationshipKind,
  type InviteIntent,
} from "@/types/aihsafe/invite-intent";

export type InviteIntentCreateFields = {
  inviteIntent:          string;
  relationshipKind:      string;
  inviteeAgeBracket:     string | null;
  stewardDeclaration:    boolean;
  sponsorUserId:         string;
  stewardUserId:         string | null;
  targetTrustUnitId:     string | null;
  targetFamilyUnitId:    string | null;
};

export function resolveInviteIntentFromRow(invite: Invite): string {
  if (invite.inviteIntent) return invite.inviteIntent;
  if (invite.relationship === "frnd") return "adult_friend";
  if (invite.relationship === "parent" || invite.relationship === "child") return "family_adult";
  return "adult_friend";
}

export function buildInviteIntentFields(opts: {
  senderId:            string;
  inviteIntent:        InviteIntent;
  relationship?:       string | null;
  inviteeAgeBracket?:  string | null;
  stewardDeclaration?: boolean;
  targetTrustUnitId?:  string | null;
  targetFamilyUnitId?: string | null;
}): InviteIntentCreateFields {
  const stewardDeclared = opts.stewardDeclaration === true;
  // Family steward for child/teen minors only — not the trusted-adult invitee.
  const stewardUserId =
    stewardDeclared && (opts.inviteIntent === "child" || opts.inviteIntent === "teen")
      ? opts.senderId
      : null;

  return {
    inviteIntent:       opts.inviteIntent,
    relationshipKind:   defaultRelationshipKind(opts.inviteIntent),
    inviteeAgeBracket:  opts.inviteeAgeBracket ?? null,
    stewardDeclaration: stewardDeclared,
    sponsorUserId:      opts.senderId,
    stewardUserId,
    targetTrustUnitId:  opts.targetTrustUnitId ?? null,
    targetFamilyUnitId: opts.targetFamilyUnitId ?? null,
  };
}
