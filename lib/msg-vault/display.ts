import type { MsgConversationDTO, MsgParticipantDTO } from "@/types/msg-vault";
import { MsgConversationKind } from "@/types/msg-vault";

export function conversationLabel(
  conv: MsgConversationDTO,
  currentUserId: string,
): string {
  if (conv.title?.trim()) return conv.title.trim();
  if (conv.kind === MsgConversationKind.DIRECT) {
    const other = conv.participants?.find(
      (p) => p.userId !== currentUserId && p.status === "ACTIVE",
    );
    if (other?.user) {
      return `${other.user.firstName} ${other.user.lastName}`.trim();
    }
    const names = participantNames(conv.participants, currentUserId);
    if (names) return names;
    return "Direct chat";
  }
  if (conv.kind === MsgConversationKind.SPACE_THREAD) return "Space thread";
  if (conv.kind === MsgConversationKind.NOTICE_THREAD) return "Notice thread";
  return "Thread";
}

export function formatRelativeTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export function participantNames(
  participants: MsgParticipantDTO[] | undefined,
  currentUserId: string,
): string {
  if (!participants?.length) return "";
  return participants
    .filter((p) => p.userId !== currentUserId)
    .map((p) =>
      p.user ? `${p.user.firstName} ${p.user.lastName}`.trim() : "Member",
    )
    .join(", ");
}
