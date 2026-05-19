// Aggregated Msg Vault notice shape (Agent 53). Extends public DTO without Prisma.

import type { MsgNoticeDTO } from "@/types/msg-vault";

export type VaultNoticeSource = "persisted" | "approval" | "invite" | "audit";

export interface VaultNoticeDTO extends MsgNoticeDTO {
  source: VaultNoticeSource;
  sourceId: string;
  href: string | null;
  contextLines: string[];
}

export interface VaultNoticesResult {
  items: VaultNoticeDTO[];
  unreadCount: number;
}
