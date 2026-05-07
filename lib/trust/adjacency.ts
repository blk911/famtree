import { prisma } from "@/lib/db/prisma";

/** Edges: ACCEPTED invites (sender↔registered recipient), ACCEPTED connection_requests, ACTIVE trust unit cliques. */
export async function buildTrustAdjacency(): Promise<Map<string, Set<string>>> {
  const users = await prisma.user.findMany({
    select: { id: true, email: true },
  });
  const emailToId = new Map(users.map((u) => [u.email.toLowerCase(), u.id]));

  const adjacency = new Map<string, Set<string>>();
  const connect = (a: string, b: string) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a)!.add(b);
    adjacency.get(b)!.add(a);
  };

  const invites = await prisma.invite.findMany({
    where: { status: "ACCEPTED" },
    select: { senderId: true, recipientEmail: true },
  });
  for (const invite of invites) {
    const recipientId = emailToId.get(invite.recipientEmail.toLowerCase());
    if (recipientId) connect(invite.senderId, recipientId);
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

/** Deterministic “blk”: first sorted neighbor id ≠ senderId. */
export function pickFirstNeighbor(senderId: string, adjacency: Map<string, Set<string>>): string | null {
  const neighbors = adjacency.get(senderId) ?? new Set<string>();
  const sorted = Array.from(neighbors).filter((id) => id !== senderId).sort();
  return sorted[0] ?? null;
}
