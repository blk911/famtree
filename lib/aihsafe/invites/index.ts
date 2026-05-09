// AIH Safe Base Scaffold — foundational contract only. Do not add feature logic here.
//
// AIH Safe Invite Service
// Wraps the existing lib/invite/index.ts with guardian-consent lifecycle rules.
// Routes guardian-created child invites through the parental consent gate.
// Must never duplicate invite token generation — always delegate to existing lib/invite/.
// Must never bypass the identity challenge.
// Must never create user accounts directly.
// Implemented by: Agent 1 (aihsafe-agent-1-core-graph)

import type { UserId, InviteId, ChildId } from "@/types/aihsafe/ids";
import type { AIHInviteState } from "@/types/aihsafe/invite-states";

// TODO(Agent 1): Implement.
// For standard adult invites: delegate entirely to existing lib/invite/index.ts.
// For child invites: add guardian consent step before creating the Invite record.

export async function sendChildInvite(
  _senderId: UserId,
  _guardianId: UserId,
  _recipientEmail: string,
  _relationship: string
): Promise<{ inviteId: InviteId; state: AIHInviteState }> {
  throw new Error("Not implemented — pending Agent 1 (aihsafe-agent-1-core-graph)");
}

export async function getInviteState(
  _inviteId: InviteId
): Promise<AIHInviteState> {
  throw new Error("Not implemented — pending Agent 1 (aihsafe-agent-1-core-graph)");
}

export async function guardianApproveInvite(
  _guardianId: UserId,
  _inviteId: InviteId
): Promise<void> {
  throw new Error("Not implemented — pending Agent 1 (aihsafe-agent-1-core-graph)");
}

export async function guardianDeclineInvite(
  _guardianId: UserId,
  _inviteId: InviteId
): Promise<void> {
  throw new Error("Not implemented — pending Agent 1 (aihsafe-agent-1-core-graph)");
}
