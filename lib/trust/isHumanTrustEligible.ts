import { prisma } from "@/lib/db/prisma";
import type { ActorContext } from "@/types/aihsafe/governance";

/** User-facing copy when admin/system accounts attempt bonds or Trust Units. */
export const ADMIN_HUMAN_TRUST_MESSAGE =
  "Admin accounts are system accounts and are not eligible for human trust bonds or Trust Units. Use a member profile to participate.";

/**
 * Human peer-trust eligibility (bonds + Trust Units). System/admin identities are excluded.
 * Email substring rule matches product requirement for operator accounts (e.g. admin@ / *admin* patterns).
 */
export function isHumanTrustEligible(user: {
  role?: string | null;
  isAdmin?: boolean | null;
  systemRole?: string | null;
  email?: string | null;
}): boolean {
  const role = String(user.role ?? "").toUpperCase();
  const systemRole = String(user.systemRole ?? "").toUpperCase();
  const email = String(user.email ?? "").toLowerCase();

  if (user.isAdmin === true) return false;
  if (role === "ADMIN") return false;
  if (role === "SUPER_ADMIN") return false;
  if (role === "SYSTEM") return false;
  if (systemRole === "ADMIN") return false;
  if (systemRole === "SYSTEM") return false;
  if (email.includes("admin")) return false;

  return true;
}

export function isHumanTrustEligibleActor(actor: Pick<ActorContext, "systemRole">): boolean {
  return isHumanTrustEligible({ systemRole: actor.systemRole });
}

/** Batch-load roles/emails and preserve `userIds` order. */
export async function filterHumanTrustEligibleUserIds(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];
  const rows = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, role: true, email: true },
  });
  const eligible = new Set(
    rows.filter((r) => isHumanTrustEligible({ role: r.role, email: r.email })).map((r) => r.id),
  );
  return userIds.filter((id) => eligible.has(id));
}

/** Full-graph preload for adjacency (single round-trip). */
export async function loadHumanEligibleUserIdSet(): Promise<Set<string>> {
  const rows = await prisma.user.findMany({
    select: { id: true, role: true, email: true },
  });
  return new Set(rows.filter((u) => isHumanTrustEligible(u)).map((u) => u.id));
}
