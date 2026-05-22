// Msg Vault — context rail formatters (client-safe, no Prisma).

import type {
  MsgConversationDTO,
  MsgParticipantDTO,
} from "@/types/msg-vault";
import { MsgConversationKind } from "@/types/msg-vault";

export function conversationKindLabel(kind: MsgConversationDTO["kind"]): string {
  switch (kind) {
    case MsgConversationKind.DIRECT:
      return "Chat";
    case MsgConversationKind.THREAD:
      return "Trust thread";
    case MsgConversationKind.SPACE_THREAD:
      return "Space thread";
    case MsgConversationKind.NOTICE_THREAD:
      return "Notice thread";
    default:
      return "Chat";
  }
}

export function formatVisibilityScope(scope: string | undefined): string {
  if (!scope) return "Not set";
  return scope.replace(/_/g, " ");
}

export function participantDisplayName(p: MsgParticipantDTO): string {
  if (p.user) {
    return `${p.user.firstName} ${p.user.lastName}`.trim();
  }
  return "Member";
}

export function participantReadLabel(
  p: MsgParticipantDTO,
  lastMessageAt: string | null,
): string {
  if (!lastMessageAt) return "No messages yet";
  if (!p.lastReadAt) return "Unread";
  const read = new Date(p.lastReadAt);
  const last = new Date(lastMessageAt);
  if (read >= last) return "Read";
  return "Unread";
}

export function noticeRequiresAction(kind: string): boolean {
  return kind === "APPROVAL_REQUIRED" || kind === "MESSAGE_BLOCKED";
}
