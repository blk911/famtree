// Msg Vault — governance overlay / explainability (Agent 49 stubs).

import { msgVaultNotImplemented } from "@/lib/msg-vault/stub";
import type { GovernanceOverlayDTO } from "@/types/msg-vault";

export async function buildGovernanceOverlay(
  _userId: string,
  _conversationId: string,
): Promise<GovernanceOverlayDTO> {
  msgVaultNotImplemented();
}

export async function explainConversationAccess(
  _userId: string,
  _conversationId: string,
): Promise<string> {
  msgVaultNotImplemented();
}
