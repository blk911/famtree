// Msg Vault — notice service contracts (Agent 49 stubs).

import { msgVaultNotImplemented } from "@/lib/msg-vault/stub";
import type { CreateNoticeInput, MsgNoticeDTO } from "@/types/msg-vault";

export async function listNoticesForUser(_userId: string): Promise<MsgNoticeDTO[]> {
  msgVaultNotImplemented();
}

export async function markNoticeRead(
  _userId: string,
  _noticeId: string,
): Promise<MsgNoticeDTO> {
  msgVaultNotImplemented();
}

export async function createNotice(_input: CreateNoticeInput): Promise<MsgNoticeDTO> {
  msgVaultNotImplemented();
}
