import type { FamilyUnitDTO, TrustUnitDTO } from "@/types/aihsafe/dto";

export type MemberCandidate = {
  userId:      string;
  displayName: string;
  sources:     string[];
};

/** People in family units and trusted spaces (excluding self). */
export function buildMemberCandidates(
  currentUserId: string,
  trustUnits:    TrustUnitDTO[],
  familyUnits:   FamilyUnitDTO[],
): MemberCandidate[] {
  const map = new Map<string, MemberCandidate>();

  function add(userId: string, displayName: string, source: string) {
    if (userId === currentUserId) return;
    const existing = map.get(userId);
    if (existing) {
      if (!existing.sources.includes(source)) existing.sources.push(source);
    } else {
      map.set(userId, { userId, displayName, sources: [source] });
    }
  }

  for (const fu of familyUnits) {
    if (fu.status === "dissolved") continue;
    for (const m of fu.members) {
      if (!m.exitedAt) add(m.userId, m.displayName, fu.name);
    }
  }

  for (const tu of trustUnits) {
    for (const m of tu.members) {
      if (!m.exitedAt) add(m.userId, m.displayName, tu.name ?? tu.kind);
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );
}
