// Msg Vault — message service contracts (Agent 49 stubs).

import { msgVaultNotImplemented } from "@/lib/msg-vault/stub";
import type { MsgMessageDTO, SendMessageInput } from "@/types/msg-vault";

export async function listMessages(
  _conversationId: string,
  _userId: string,
): Promise<MsgMessageDTO[]> {
  msgVaultNotImplemented();
}

export async function sendMessage(
  _actorUserId: string,
  _conversationId: string,
  _input: SendMessageInput,
): Promise<MsgMessageDTO> {
  msgVaultNotImplemented();
}

export async function removeMessage(
  _actorUserId: string,
  _messageId: string,
): Promise<void> {
  msgVaultNotImplemented();
}
