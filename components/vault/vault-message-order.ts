import type { MsgMessageDTO } from "@/types/msg-vault";

/** API returns messages newest-first; UI renders oldest-first. */
export function sortMessagesChronological(items: MsgMessageDTO[]): MsgMessageDTO[] {
  return [...items].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

/** Prepend a new message into newest-first store (matches listMessages order). */
export function prependVaultMessage(
  items: MsgMessageDTO[],
  message: MsgMessageDTO,
): MsgMessageDTO[] {
  if (items.some((m) => m.id === message.id)) return items;
  return [message, ...items];
}
