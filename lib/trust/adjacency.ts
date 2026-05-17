import { prisma } from "@/lib/db/prisma";
import { normalizeInviteEmail } from "@/lib/invite";
import { filterHumanTrustEligibleUserIds, loadHumanEligibleUserIdSet } from "@/lib/trust/isHumanTrustEligible";

/** Edges: REGISTERED/ACCEPTED invites, user.invitedById sponsor links, ACCEPTED connection_requests, ACTIVE trust unit cliques. */
export async function buildTrustAdjacency(): Promise<Map<string, Set<string>>> {
  const eligIds = await loadHumanEligibleUserIdSet();

  const users = await prisma.user.findMany({
    select: { id: true, email: true },
  });
  const emailToId = new Map(users.map((u) => [normalizeInviteEmail(u.email), u.id]));

  const adjacency = new Map<string, Set<string>>();
  const connect = (a: string, b: string) => {
    if (!eligIds.has(a) || !eligIds.has(b)) return;
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a)!.add(b);
    adjacency.get(b)!.add(a);
  };

  const invites = await prisma.invite.findMany({
    /** REGISTERED = invitee has an account; edge matches downhill bonds used elsewhere */
    where: { status: { in: ["ACCEPTED", "REGISTERED"] } },
    select: { senderId: true, recipientEmail: true },
  });
  for (const invite of invites) {
    const recipientId = emailToId.get(normalizeInviteEmail(invite.recipientEmail));
    if (recipientId) connect(invite.senderId, recipientId);
  }

  /** Sponsor link stored on user row — covers invite email drift vs `users.email` */
  const invitedByRows = await prisma.user.findMany({
    where: { invitedById: { not: null } },
    select: { id: true, invitedById: true },
  });
  for (const u of invitedByRows) {
    if (u.invitedById) connect(u.invitedById, u.id);
  }

  const acceptedConnections = await prisma.connectionRequest.findMany({
    where: { status: "ACCEPTED" },
    select: { requesterId: true, targetId: true },
  });
  for (const row of acceptedConnections) {
    connect(row.requesterId, row.targetId);
  }

  const activeUnitRows = await prisma.trustUnitMember.findMany({
    where: { trustUnit: { status: "ACTIVE" } },
    select: { trustUnitId: true, userId: true },
  });
  const byUnit = new Map<string, string[]>();
  for (const row of activeUnitRows) {
    if (!byUnit.has(row.trustUnitId)) byUnit.set(row.trustUnitId, []);
    byUnit.get(row.trustUnitId)!.push(row.userId);
  }
  for (const ids of Array.from(byUnit.values())) {
    for (const a of ids) {
      for (const b of ids) {
        if (a !== b) connect(a, b);
      }
    }
  }

  return adjacency;
}

/** Deterministic fallback: first sorted neighbor id ≠ senderId. */
export function pickFirstNeighbor(senderId: string, adjacency: Map<string, Set<string>>): string | null {
  const neighbors = adjacency.get(senderId) ?? new Set<string>();
  const sorted = Array.from(neighbors).filter((id) => id !== senderId).sort();
  return sorted[0] ?? null;
}

/**
 * Prefer a downhill invite bond (sponsor → invitee) among graph neighbors so auto-TU matches the person
 * the sponsor actually invited onto the tree; otherwise same as pickFirstNeighbor.
 */
export async function pickNeighborForAutoTrustUnit(
  senderId: string,
  adjacency: Map<string, Set<string>>,
): Promise<string | null> {
  const neighbors = Array.from(adjacency.get(senderId) ?? new Set<string>()).filter((id) => id !== senderId);
  if (neighbors.length === 0) return null;

  const eligibleNeighbors = await filterHumanTrustEligibleUserIds(neighbors);
  if (eligibleNeighbors.length === 0) return null;
  const eligibleSet = new Set(eligibleNeighbors);

  const downhill = await prisma.connectionRequest.findMany({
    where: {
      requesterId: senderId,
      status: "ACCEPTED",
      targetId: { in: eligibleNeighbors },
    },
    select: { targetId: true },
    orderBy: { targetId: "asc" },
  });
  for (const row of downhill) {
    if (eligibleSet.has(row.targetId)) return row.targetId;
  }

  const neighborUsers = await prisma.user.findMany({
    where: { id: { in: eligibleNeighbors } },
    select: { id: true, email: true },
  });
  const neighborSet = new Set(eligibleNeighbors);
  const emailToNeighborId = new Map(
    neighborUsers.map((u) => [normalizeInviteEmail(u.email), u.id]),
  );
  const invitesFromSender = await prisma.invite.findMany({
    where: {
      senderId,
      status: { in: ["ACCEPTED", "REGISTERED"] },
    },
    select: { recipientEmail: true },
    orderBy: { createdAt: "desc" },
  });
  for (const inv of invitesFromSender) {
    const nid = emailToNeighborId.get(normalizeInviteEmail(inv.recipientEmail));
    if (nid && neighborSet.has(nid)) return nid;
  }

  return [...eligibleNeighbors].sort()[0] ?? null;
}
