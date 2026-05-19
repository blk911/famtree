import type { MsgConversationDTO } from "@/types/msg-vault";

/** Unread indicator: 1 = show dot, 0 = none. Full counts deferred to vault read API. */
export function conversationUnreadCount(
  conv: MsgConversationDTO,
  currentUserId: string,
): number {
  const me = conv.participants?.find((p) => p.userId === currentUserId);
  if (!conv.lastMessageAt) return 0;
  if (!me?.lastReadAt) return 1;
  return new Date(conv.lastMessageAt) > new Date(me.lastReadAt) ? 1 : 0;
}
