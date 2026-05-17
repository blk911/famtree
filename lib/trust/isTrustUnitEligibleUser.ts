import { prisma } from "@/lib/db/prisma";
import type { ActorContext } from "@/types/aihsafe/governance";

/**
 * Centralized rule: system / authority accounts do not participate in Trust Unit eligibility
 * (create, join, invite targets, legacy wedge formation, or AIH Safe trust-unit APIs).
 *
 * Human founders remain eligible; DB `User.role` uses lowercase (`admin`, `member`, `founder`).
 */
export function isTrustUnitEligibleUser(user: {
  role?: string | null;
  isAdmin?: boolean | null;
  systemRole?: string | null;
}): boolean {
  const role = String(user.role ?? "").toUpperCase();
  const systemRole = String(user.systemRole ?? "").toUpperCase();
  if (user.isAdmin === true) return false;
  if (role === "ADMIN") return false;
  if (role === "SUPER_ADMIN") return false;
  if (role === "SYSTEM") return false;
  if (systemRole === "ADMIN") return false;
  if (systemRole === "SYSTEM") return false;
  return true;
}

export function isTrustUnitEligibleActor(actor: Pick<ActorContext, "systemRole">): boolean {
  return isTrustUnitEligibleUser({ systemRole: actor.systemRole });
}

/** Preserves `userIds` order; drops unknown ids and ineligible roles. */
export async function filterTrustUnitEligibleUserIds(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];
  const rows = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, role: true },
  });
  const eligible = new Set(
    rows.filter((r) => isTrustUnitEligibleUser({ role: r.role })).map((r) => r.id),
  );
  return userIds.filter((id) => eligible.has(id));
}
