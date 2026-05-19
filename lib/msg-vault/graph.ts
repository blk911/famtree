import { listMembershipsForUser } from "@/lib/aihsafe/graph";
import { asAIHUserId } from "@/types/aihsafe/ids";
import type { ActorContext } from "@/types/aihsafe/governance";
import type { TrustUnitId } from "@/types/aihsafe/ids";

export async function sharedTrustUnitIdsBetween(
  actor: ActorContext,
  targetUserId: string,
): Promise<TrustUnitId[]> {
  const targetMemberships = await listMembershipsForUser(asAIHUserId(targetUserId));
  const actorUnits = new Set(
    actor.memberships
      .filter((m) => m.exitedAt === null)
      .map((m) => m.trustUnitId as string),
  );
  return targetMemberships
    .filter((m) => m.exitedAt === null && actorUnits.has(m.trustUnitId as string))
    .map((m) => m.trustUnitId);
}
