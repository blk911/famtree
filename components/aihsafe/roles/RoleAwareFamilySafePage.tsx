// Server component — selects AIH Safe presentation from assembled ActorContext (no extra APIs).

import type { ActorContext } from "@/types/aihsafe/governance";
import { isMinorTier } from "@/types/aihsafe/age-tiers";
import { FamilySafeRole, SystemRole } from "@/types/aihsafe/roles";
import { FounderView } from "@/components/aihsafe/roles/FounderView";
import { MemberView } from "@/components/aihsafe/roles/MemberView";
import { ChildView } from "@/components/aihsafe/roles/ChildView";

export type SafeRoleViewKind = "founder" | "member" | "child";

/**
 * Presentation-only routing for `/aihsafe`. Uses existing governance-derived fields only.
 * UI hiding is not authorization — APIs and governance kernel remain authoritative.
 */
export function deriveSafeRoleView(actor: ActorContext): SafeRoleViewKind {
  if (isMinorTier(actor.ageTier)) return "child";

  const steward =
    actor.systemRole === SystemRole.FOUNDER ||
    actor.systemRole === SystemRole.ADMIN ||
    actor.familySafeRole === FamilySafeRole.GUARDIAN;

  if (steward) return "founder";
  return "member";
}

export function RoleAwareFamilySafePage({
  actor,
  currentUserId,
}: {
  actor: ActorContext;
  currentUserId: string;
}) {
  const kind = deriveSafeRoleView(actor);
  if (kind === "founder") return <FounderView currentUserId={currentUserId} />;
  if (kind === "member") return <MemberView currentUserId={currentUserId} />;
  return <ChildView currentUserId={currentUserId} />;
}
