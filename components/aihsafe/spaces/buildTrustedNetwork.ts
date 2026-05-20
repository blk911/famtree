import { buildMemberCandidates, type MemberCandidate } from "@/components/aihsafe/people/memberCandidates";
import type { FamilyUnitDTO, GuardianLinkDTO, InviteDTO, TrustUnitDTO } from "@/types/aihsafe/dto";

/** Active trusted network for space creation (no public search). */
export function buildTrustedNetwork(
  currentUserId: string,
  trustUnits: TrustUnitDTO[],
  familyUnits: FamilyUnitDTO[],
  guardianLinks: GuardianLinkDTO[],
): MemberCandidate[] {
  const map = new Map<string, MemberCandidate>();

  for (const c of buildMemberCandidates(currentUserId, trustUnits, familyUnits)) {
    map.set(c.userId, c);
  }

  for (const link of guardianLinks) {
    if (link.revokedAt) continue;
    const add = (userId: string, name: string, source: string) => {
      if (userId === currentUserId) return;
      const existing = map.get(userId);
      if (existing) {
        if (!existing.sources.includes(source)) existing.sources.push(source);
      } else {
        map.set(userId, { userId, displayName: name, sources: [source] });
      }
    };
    if (link.kind === "trusted_adult") {
      add(link.guardianUserId, link.guardianName, "Trusted adult");
    } else {
      add(link.childUserId, link.childName, "Family");
      if (link.guardianUserId !== currentUserId) {
        add(link.guardianUserId, link.guardianName, "Guardian");
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function pendingInviteEmails(invites: InviteDTO[]): string[] {
  return invites
    .filter((i) => i.status === "PENDING")
    .map((i) => i.recipientEmail);
}
