// Msg Vault — conversation service contracts (Agent 49 stubs).

import { msgVaultNotImplemented } from "@/lib/msg-vault/stub";
import type {
  CreateThreadConversationInput,
  MsgConversationDTO,
  MsgParticipantDTO,
} from "@/types/msg-vault";

export async function listConversationsForUser(
  _userId: string,
): Promise<MsgConversationDTO[]> {
  msgVaultNotImplemented();
}

export async function getConversationById(
  _conversationId: string,
): Promise<MsgConversationDTO | null> {
  msgVaultNotImplemented();
}

export async function createDirectConversation(
  _actorUserId: string,
  _targetUserId: string,
): Promise<MsgConversationDTO> {
  msgVaultNotImplemented();
}

export async function createThreadConversation(
  _actorUserId: string,
  _input: CreateThreadConversationInput,
): Promise<MsgConversationDTO> {
  msgVaultNotImplemented();
}

export async function listParticipants(
  _conversationId: string,
): Promise<MsgParticipantDTO[]> {
  msgVaultNotImplemented();
}
