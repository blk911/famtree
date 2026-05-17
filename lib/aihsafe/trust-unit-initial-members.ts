// Resolve creator + optional initial member IDs into validated TrustUnitMember rows.
// Unknown or inactive user IDs are omitted (no error — keeps creation resilient).

import { prisma } from "@/lib/db/prisma";

export async function resolveInitialTrustUnitMemberUserIds(
  creatorId: string,
  rawMemberIds: string[]
): Promise<string[]> {
  const others = Array.from(new Set(rawMemberIds.map(String).map(s => s.trim()).filter(Boolean))).filter(
    id => id !== creatorId
  );
  if (others.length === 0) return [creatorId];

  const rows = await prisma.user.findMany({
    where: { id: { in: others }, status: "active" },
    select: { id: true },
  });
  const ok = new Set(rows.map(r => r.id));
  return [creatorId, ...others.filter(id => ok.has(id))];
}

/** Clamp and ensure room for all initial members (cap 100 matches API schema). */
export function effectiveTrustUnitMaxMembers(requestedMax: number, memberCount: number): number {
  return Math.min(100, Math.max(requestedMax, memberCount));
}
