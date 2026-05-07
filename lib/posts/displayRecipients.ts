/** Resolve PostVisibility rows into sorted display names for post headers. */

export type VisibilityRow = { userId: string };

export type NamedPerson = { id: string; firstName: string; lastName: string };

export function displayRecipientsFromVisibility(
  visibility: VisibilityRow[] | undefined,
  authorUserId: string,
  membersById: Map<string, NamedPerson>,
): Array<{ id: string; displayName: string }> | undefined {
  if (!visibility?.length) return undefined;
  const seen = new Set<string>();
  const out: Array<{ id: string; displayName: string }> = [];
  for (const { userId } of visibility) {
    if (!userId || userId === authorUserId || seen.has(userId)) continue;
    seen.add(userId);
    const m = membersById.get(userId);
    const displayName = m ? `${m.firstName} ${m.lastName}`.trim() || "Unknown" : "Unknown";
    out.push({ id: userId, displayName });
  }
  if (out.length === 0) return undefined;
  out.sort((a, b) =>
    a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" }),
  );
  return out;
}
