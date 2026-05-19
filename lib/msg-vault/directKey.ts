/**
 * Stable key for a governed direct conversation between two users.
 * Sorts IDs so A/B and B/A resolve to the same key (matches legacy `directThreadKey`).
 */
export function makeDirectConversationKey(userA: string, userB: string): string {
  return [userA, userB].sort().join(",");
}
