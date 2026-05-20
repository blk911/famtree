/**
 * Msg Vault conversation display guards (Agent 80).
 * UI-only filtering — does not mutate data or governance rules.
 */

import {
  getActiveMemberUserIds,
  isSelfOnlyTrustUnit,
  type TrustUnitLike,
} from "@/lib/trust/display";
import type { MsgConversationDTO, MsgParticipantDTO } from "@/types/msg-vault";
import { MsgConversationKind } from "@/types/msg-vault";

export type StaleConversationReason =
  | "no_messages"
  | "solo_participant"
  | "missing_other_participant"
  | "trust_unit_orphan"
  | "trust_unit_inactive"
  | "trust_unit_self_only";

export type TrustUnitRowForGuard = {
  id: string;
  members: Array<{ user?: { id: string }; userId?: string; exitedAt?: string | null }>;
};

export function trustUnitMapFromRows(
  units: TrustUnitRowForGuard[],
): Map<string, TrustUnitLike> {
  return new Map(
    units.map((u) => [
      u.id,
      {
        id: u.id,
        members: u.members.map((m) => ({
          userId: m.userId ?? m.user?.id,
          exitedAt: m.exitedAt ?? null,
        })),
      },
    ]),
  );
}

function activeParticipants(conv: MsgConversationDTO): MsgParticipantDTO[] {
  return (conv.participants ?? []).filter((p) => p.status === "ACTIVE");
}

function otherActiveParticipants(
  conv: MsgConversationDTO,
  currentUserId: string,
): MsgParticipantDTO[] {
  return activeParticipants(conv).filter((p) => p.userId !== currentUserId);
}

export function classifyStaleConversation(
  conv: MsgConversationDTO,
  currentUserId: string,
  trustUnitMap?: Map<string, TrustUnitLike>,
): StaleConversationReason | null {
  const active = activeParticipants(conv);
  const others = otherActiveParticipants(conv, currentUserId);

  if (conv.kind === MsgConversationKind.DIRECT) {
    if (active.length <= 1) return "solo_participant";
    if (others.length === 0) return "missing_other_participant";
    // Empty direct chats are valid — users open them from the People list before the first message.
    return null;
  }

  if (!conv.lastMessageAt) {
    return "no_messages";
  }

  const tuId = conv.trustUnitId;
  const isTuThread =
    tuId &&
    (conv.kind === MsgConversationKind.THREAD ||
      conv.kind === MsgConversationKind.SPACE_THREAD);

  if (isTuThread) {
    const unit = trustUnitMap?.get(tuId);
    if (!unit) return "trust_unit_orphan";
    const memberIds = getActiveMemberUserIds(unit);
    if (memberIds.length < 2) return "trust_unit_inactive";
    if (isSelfOnlyTrustUnit(unit, currentUserId)) return "trust_unit_self_only";
  }

  if (active.length <= 1 || others.length === 0) {
    return "missing_other_participant";
  }

  return null;
}

export function isStaleMsgVaultConversation(
  conv: MsgConversationDTO,
  currentUserId: string,
  trustUnitMap?: Map<string, TrustUnitLike>,
): boolean {
  return classifyStaleConversation(conv, currentUserId, trustUnitMap) !== null;
}

export function filterVisibleConversations(
  conversations: MsgConversationDTO[],
  currentUserId: string,
  trustUnits: TrustUnitRowForGuard[] = [],
): MsgConversationDTO[] {
  const map = trustUnitMapFromRows(trustUnits);
  return conversations.filter(
    (c) => !isStaleMsgVaultConversation(c, currentUserId, map),
  );
}
