// AIH Safe — Actor Context Builder
// Assembles a fully-populated ActorContext for a given user ID.
// Called by API routes before invoking any governance or visibility function.
//
// This function fetches all required data and derives computed fields.
// It makes no authorization decisions — it only assembles context.
// All governance decisions happen in lib/aihsafe/governance/ after context is built.

import { prisma } from "@/lib/db/prisma";
import type { AIHUserId } from "@/types/aihsafe/ids";
import type { ActorContext } from "@/types/aihsafe/governance";
import { SystemRole } from "@/types/aihsafe/roles";
import { asAIHUserId } from "@/types/aihsafe/ids";
import { deriveAgeTier, deriveFamilySafeRole } from "@/lib/aihsafe/governance";
import {
  listMembershipsForUser,
  getGuardianRelationshipsForGuardian,
  getGuardianRelationshipsForChild,
  listRelationshipEdgesForUser,
} from "@/lib/aihsafe/graph";

// ─── buildActorContext ────────────────────────────────────────────────────────

/**
 * Fetch all graph data for a user and derive their full ActorContext.
 * Throws if the user does not exist or is not active.
 *
 * Caller must have already validated authentication (requireAuth / getCurrentUser).
 * This function performs additional graph reads beyond the session check.
 */
export async function buildActorContext(userId: AIHUserId): Promise<ActorContext> {
  const user = await prisma.user.findUnique({
    where:  { id: userId as string },
    select: { id: true, role: true, status: true, dateOfBirth: true },
  });

  if (!user) {
    throw new Error(`buildActorContext: user ${userId as string} not found`);
  }
  if (user.status !== "active") {
    throw new Error(`buildActorContext: user ${userId as string} is not active (status: ${user.status})`);
  }

  const actorUserId = asAIHUserId(user.id);

  // Parallel fetches — all reads are independent.
  const [memberships, guardianRelationships, guardedByRelationships, relationshipEdges] =
    await Promise.all([
      listMembershipsForUser(actorUserId),
      getGuardianRelationshipsForGuardian(actorUserId),
      getGuardianRelationshipsForChild(actorUserId),
      listRelationshipEdgesForUser(actorUserId),
    ]);

  const ageTier        = deriveAgeTier(user.dateOfBirth ?? null);
  const familySafeRole = deriveFamilySafeRole(ageTier, guardianRelationships);
  const systemRole     = mapSystemRole(user.role);

  return {
    actorUserId,
    ageTier,
    systemRole,
    familySafeRole,
    memberships,
    guardianRelationships,
    guardedByRelationships,
    relationshipEdges,
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function mapSystemRole(role: string): ActorContext["systemRole"] {
  switch (role) {
    case "founder": return SystemRole.FOUNDER;
    case "admin":   return SystemRole.ADMIN;
    default:        return SystemRole.MEMBER;
  }
}
