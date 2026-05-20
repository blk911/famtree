import { buildMemberCandidates } from "@/components/aihsafe/people/memberCandidates";
import type {
  FamilyUnitDTO,
  GuardianLinkDTO,
  TrustUnitDTO,
} from "@/types/aihsafe/dto";
import type { FamilySafeShellMode } from "@/components/aihsafe/roles/shellMode";

export type PeopleSnapshotRow = {
  id: string;
  name: string;
  detail: string;
};

export type PeopleSnapshot = {
  steward: PeopleSnapshotRow | null;
  children: PeopleSnapshotRow[];
  trustedAdults: PeopleSnapshotRow[];
  adults: PeopleSnapshotRow[];
};

export function buildPeopleSnapshot(
  currentUserId: string,
  shellMode: FamilySafeShellMode,
  trustUnits: TrustUnitDTO[],
  familyUnits: FamilyUnitDTO[],
  guardianLinks: GuardianLinkDTO[],
): PeopleSnapshot {
  const activeLinks = guardianLinks.filter((l) => !l.revokedAt);
  const childIds = new Set(
    activeLinks.filter((l) => l.kind !== "trusted_adult").map((l) => l.childUserId),
  );
  const trustedIds = new Set(
    activeLinks.filter((l) => l.kind === "trusted_adult").map((l) => l.guardianUserId),
  );

  for (const fu of familyUnits) {
    for (const m of fu.members) {
      if (!m.exitedAt && m.role === "child") childIds.add(m.userId);
    }
  }

  const candidates = buildMemberCandidates(currentUserId, trustUnits, familyUnits);
  const children: PeopleSnapshotRow[] = [];
  const trustedAdults: PeopleSnapshotRow[] = [];
  const adults: PeopleSnapshotRow[] = [];

  for (const link of activeLinks) {
    if (link.kind === "trusted_adult") {
      const adultId = link.guardianUserId;
      if (adultId !== currentUserId && !trustedAdults.some((x) => x.id === adultId)) {
        trustedAdults.push({
          id: adultId,
          name: link.guardianName,
          detail: "Trusted adult",
        });
      }
    } else if (link.guardianUserId === currentUserId) {
      if (!children.some((x) => x.id === link.childUserId)) {
        children.push({
          id: link.childUserId,
          name: link.childName,
          detail: "In your care",
        });
      }
    }
  }

  for (const c of candidates) {
    if (childIds.has(c.userId)) {
      if (!children.some((x) => x.id === c.userId)) {
        children.push({ id: c.userId, name: c.displayName, detail: c.sources[0] ?? "Family" });
      }
      continue;
    }
    if (trustedIds.has(c.userId)) {
      if (!trustedAdults.some((x) => x.id === c.userId)) {
        trustedAdults.push({ id: c.userId, name: c.displayName, detail: "Trusted adult" });
      }
      continue;
    }
    adults.push({
      id: c.userId,
      name: c.displayName,
      detail: c.sources.slice(0, 2).join(" · "),
    });
  }

  const steward: PeopleSnapshotRow | null =
    shellMode === "founder"
      ? { id: currentUserId, name: "You", detail: "Family steward" }
      : null;

  return {
    steward,
    children: children.slice(0, 6),
    trustedAdults: trustedAdults.slice(0, 6),
    adults: adults.slice(0, 8),
  };
}
