import { makeDirectConversationKey } from "@/lib/msg-vault/directKey";

/**
 * Canonical 1:1 participant key for dashboard Post-based private threads.
 * Delegates to Msg Vault `makeDirectConversationKey` so both surfaces stay aligned.
 */
export function directThreadKey(userIdA: string, userIdB: string): string {
  return makeDirectConversationKey(userIdA, userIdB);
}
