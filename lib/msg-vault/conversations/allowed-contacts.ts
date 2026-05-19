// Governed direct-chat contact list — server-side only (Agent 52).

import { prisma } from "@/lib/db/prisma";
import { buildActorContext } from "@/lib/aihsafe/context/buildActorContext";
import { canMessage } from "@/lib/aihsafe/governance";
import { listMembersForTrustUnit } from "@/lib/aihsafe/graph";
import { asAIHUserId } from "@/types/aihsafe/ids";
import { makeDirectConversationKey } from "@/lib/msg-vault/directKey";
import { sharedTrustUnitIdsBetween } from "@/lib/msg-vault/graph";

export interface AllowedChatContactDTO {
  userId: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  /** Human-readable reasons this contact is messageable (no stranger discovery). */
  reasons: string[];
  existingConversationId: string | null;
}

export async function listAllowedChatContacts(
  actorUserId: string,
): Promise<AllowedChatContactDTO[]> {
  const actor = await buildActorContext(asAIHUserId(actorUserId));
  const reasonsByUser = new Map<string, Set<string>>();

  function addCandidate(userId: string, reason: string) {
    if (userId === actorUserId) return;
    if (!reasonsByUser.has(userId)) reasonsByUser.set(userId, new Set());
    reasonsByUser.get(userId)!.add(reason);
  }

  // Guardian ↔ child
  for (const g of actor.guardianRelationships) {
    if (g.revokedAt) continue;
    addCandidate(g.childUserId as string, "Family member you guard");
  }
  for (const g of actor.guardedByRelationships) {
    if (g.revokedAt) continue;
    addCandidate(g.guardianUserId as string, "Your guardian");
  }

  // Trust unit co-members
  const activeMemberships = actor.memberships.filter((m) => m.exitedAt === null);
  for (const membership of activeMemberships) {
    const unitId = membership.trustUnitId as string;
    const meta = await prisma.trustUnit.findUnique({
      where:   { id: unitId },
      include: { aihMeta: true },
    });
    const unitLabel = meta?.aihMeta?.name?.trim() || "shared trust space";
    const members = await listMembersForTrustUnit(membership.trustUnitId);
    for (const m of members) {
      if (m.exitedAt) continue;
      addCandidate(m.userId as string, `Shared trust: ${unitLabel}`);
    }
  }

  // Approved relationship edges
  for (const edge of actor.relationshipEdges) {
    if (edge.revokedAt) continue;
    const other =
      (edge.fromUserId as string) === actorUserId
        ? (edge.toUserId as string)
        : (edge.fromUserId as string);
    addCandidate(other, "Approved family connection");
  }

  // Family tree (invite chain) — people you invited
  const invitedByActor = await prisma.user.findMany({
    where:  { invitedById: actorUserId, status: "active" },
    select: { id: true },
  });
  for (const u of invitedByActor) {
    addCandidate(u.id, "Family member you invited");
  }

  // Inviter + siblings (same parent inviter)
  const selfRow = await prisma.user.findUnique({
    where:  { id: actorUserId },
    select: { invitedById: true },
  });
  if (selfRow?.invitedById) {
    addCandidate(selfRow.invitedById, "Family member who invited you");
    const siblings = await prisma.user.findMany({
      where: {
        invitedById: selfRow.invitedById,
        status:      "active",
        id:          { not: actorUserId },
      },
      select: { id: true },
    });
    for (const s of siblings) {
      addCandidate(s.id, "Family member on your branch");
    }
    // Down-tree from inviter's other invites (cousins/aunts) — members invited by siblings
    const branchIds = [selfRow.invitedById, ...siblings.map((s) => s.id)];
    const extended = await prisma.user.findMany({
      where: { invitedById: { in: branchIds }, status: "active" },
      select: { id: true },
    });
    for (const e of extended) {
      addCandidate(e.id, "Family network member");
    }
  }

  const candidateIds = Array.from(reasonsByUser.keys());
  if (candidateIds.length === 0) return [];

  const users = await prisma.user.findMany({
    where: {
      id:     { in: candidateIds },
      status: "active",
    },
    select: {
      id:        true,
      firstName: true,
      lastName:  true,
      photoUrl:  true,
    },
  });

  const allowed: AllowedChatContactDTO[] = [];

  for (const user of users) {
    const shared = await sharedTrustUnitIdsBetween(actor, user.id);
    const decision = canMessage(actor, {
      targetUserId:        asAIHUserId(user.id),
      sharedTrustUnitIds:  shared,
    });
    if (!decision.allowed) continue;

    const directKey = makeDirectConversationKey(actorUserId, user.id);
    const existing = await prisma.aihMsgConversation.findUnique({
      where:  { directKey },
      select: { id: true },
    });

    allowed.push({
      userId:                 user.id,
      firstName:              user.firstName,
      lastName:               user.lastName,
      photoUrl:               user.photoUrl,
      reasons:                Array.from(reasonsByUser.get(user.id) ?? []),
      existingConversationId: existing?.id ?? null,
    });
  }

  return allowed.sort((a, b) =>
    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
  );
}
