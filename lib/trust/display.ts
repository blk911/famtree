/**
 * Trust Unit display helpers (Agent 79).
 * UI-only: does not mutate data or governance rules.
 */

export type TrustUnitMemberLike = {
  userId?: string;
  exitedAt?: string | null;
  user?: { id: string };
};

export type TrustUnitLike = {
  id: string;
  members: TrustUnitMemberLike[];
};

export const TRUST_CIRCLES_EMPTY_TITLE = "No trust circles yet.";
export const TRUST_CIRCLES_EMPTY_HINT =
  "Create one for family, friends, work, or private groups.";
export const TRUST_CIRCLES_EMPTY_SUBHINT =
  "Invite someone or create a trusted space to get started.";

export function trustUnitMemberUserId(member: TrustUnitMemberLike): string | undefined {
  return member.userId ?? member.user?.id;
}

/** Active (non-exited) member user ids, deduped. */
export function getActiveMemberUserIds(unit: TrustUnitLike): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const m of unit.members) {
    if (m.exitedAt) continue;
    const id = trustUnitMemberUserId(m);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

/** True when the only active member is the current user (setup/draft, not a real circle). */
export function isSelfOnlyTrustUnit(unit: TrustUnitLike, currentUserId: string): boolean {
  const active = getActiveMemberUserIds(unit);
  return active.length === 1 && active[0] === currentUserId;
}

export function getActiveTrustUnits<T extends TrustUnitLike>(
  units: T[],
  currentUserId: string,
): T[] {
  return units.filter((u) => {
    const active = getActiveMemberUserIds(u);
    if (active.length === 0) return false;
    return !isSelfOnlyTrustUnit(u, currentUserId);
  });
}

export function getDraftTrustUnits<T extends TrustUnitLike>(
  units: T[],
  currentUserId: string,
): T[] {
  return units.filter((u) => isSelfOnlyTrustUnit(u, currentUserId));
}

export function countDraftTrustUnits(units: TrustUnitLike[], currentUserId: string): number {
  return getDraftTrustUnits(units, currentUserId).length;
}

/**
 * Rails and compact lists: at most one draft placeholder when multiple self-only rows exist.
 */
export function getDraftTrustUnitsForDisplay<T extends TrustUnitLike>(
  units: T[],
  currentUserId: string,
): T[] {
  const drafts = getDraftTrustUnits(units, currentUserId);
  if (drafts.length === 0) return [];
  return [drafts[0]!];
}

export function partitionTrustUnits<T extends TrustUnitLike>(
  units: T[],
  currentUserId: string,
): { active: T[]; drafts: T[]; draftCount: number } {
  const active = getActiveTrustUnits(units, currentUserId);
  const drafts = getDraftTrustUnits(units, currentUserId);
  return { active, drafts, draftCount: drafts.length };
}
