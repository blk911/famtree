/** Canonical key for a private thread participant set (matches PrivateFeedClient grouping). */
export function directThreadKey(userIdA: string, userIdB: string): string {
  return [userIdA, userIdB].sort().join(",");
}
