/**
 * Stable key for a governed direct conversation between two users.
 * Sorts IDs so A/B and B/A resolve to the same key (matches legacy `directThreadKey`).
 */
export function makeDirectConversationKey(userA: string, userB: string): string {
  return [userA, userB].sort().join(",");
}

/** Resolve a governed direct conversation from a loaded list (client-safe). */
export function findDirectConversationByPeer<
  T extends { kind: string; directKey: string | null },
>(conversations: T[], currentUserId: string, peerUserId: string): T | null {
  const key = makeDirectConversationKey(currentUserId, peerUserId);
  return (
    conversations.find((c) => c.kind === "DIRECT" && c.directKey === key) ?? null
  );
}
