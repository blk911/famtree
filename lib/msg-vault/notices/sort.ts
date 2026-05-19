import type { MsgNoticeStatus } from "@/types/msg-vault";
import { MsgNoticeStatus as Status } from "@/types/msg-vault";
import type { VaultNoticeDTO } from "./types";

export function sortVaultNotices(items: VaultNoticeDTO[]): VaultNoticeDTO[] {
  return [...items].sort((a, b) => {
    const aUnread = a.status === Status.UNREAD ? 0 : 1;
    const bUnread = b.status === Status.UNREAD ? 0 : 1;
    if (aUnread !== bUnread) return aUnread - bUnread;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function countUnread(items: VaultNoticeDTO[]): number {
  return items.filter((n) => n.status === Status.UNREAD).length;
}

export function filterByStatus(
  items: VaultNoticeDTO[],
  status?: MsgNoticeStatus,
): VaultNoticeDTO[] {
  if (!status) return items;
  return items.filter((n) => n.status === status);
}
