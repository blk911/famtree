import { prisma } from "@/lib/db/prisma";

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  photoUrl: true,
} as const;

export async function findSharedConnections(currentUserId: string, targetUserId: string) {
  const users = await prisma.user.findMany({
    select: { id: true, email: true },
  });
  const emailToId = new Map(users.map((user) => [user.email.toLowerCase(), user.id]));

  const invites = await prisma.invite.findMany({
    where: { status: "ACCEPTED" },
    select: { senderId: true, recipientEmail: true },
  });

  const adjacency = new Map<string, Set<string>>();
  const connect = (a: string, b: string) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a)!.add(b);
    adjacency.get(b)!.add(a);
  };

  for (const invite of invites) {
    const recipientId = emailToId.get(invite.recipientEmail.toLowerCase());
    if (recipientId) connect(invite.senderId, recipientId);
  }

  const acceptedConnections = await prisma.$queryRaw<Array<{ requesterId: string; targetId: string }>>`
    SELECT "requesterId", "targetId"
    FROM "connection_requests"
    WHERE status::text = 'ACCEPTED'
  `;

  for (const request of acceptedConnections) {
    connect(request.requesterId, request.targetId);
  }

  const activeUnitRows = await prisma.$queryRaw<Array<{ trustUnitId: string; userId: string }>>`
    SELECT tum."trustUnitId", tum."userId"
    FROM "trust_unit_members" tum
    JOIN "trust_units" tu ON tu.id = tum."trustUnitId"
    WHERE tu.status::text = 'ACTIVE'
  `;
  const activeUnits = Array.from(
    activeUnitRows.reduce((map, row) => {
      if (!map.has(row.trustUnitId)) map.set(row.trustUnitId, []);
      map.get(row.trustUnitId)!.push({ userId: row.userId });
      return map;
    }, new Map<string, Array<{ userId: string }>>())
  ).map(([id, members]) => ({ id, members }));

  for (const unit of activeUnits) {
    const ids = unit.members.map((member: { userId: string }) => member.userId);
    for (const a of ids) {
      for (const b of ids) {
        if (a !== b) connect(a, b);
      }
    }
  }

  const currentConnections = adjacency.get(currentUserId) ?? new Set<string>();
  const targetConnections = adjacency.get(targetUserId) ?? new Set<string>();

  return Array.from(currentConnections).filter((id) => id !== targetUserId && targetConnections.has(id));
}

export async function getTrustMembers(memberIds: string[]) {
  return prisma.user.findMany({
    where: { id: { in: memberIds } },
    select: userSelect,
  });
}

export async function getPendingTrustRequests(userId: string) {
  const requests = await prisma.$queryRaw<Array<{
    id: string;
    createdById: string;
    createdAt: Date;
    createdByFirstName: string;
    createdByLastName: string;
    createdByEmail: string;
    createdByPhotoUrl: string | null;
  }>>`
    SELECT tur.id, tur."createdById", tur."createdAt",
           u."firstName" AS "createdByFirstName",
           u."lastName" AS "createdByLastName",
           u.email AS "createdByEmail",
           u."photoUrl" AS "createdByPhotoUrl"
    FROM "trust_unit_requests" tur
    JOIN "trust_unit_request_members" tum ON tum."requestId" = tur.id
    JOIN "trust_unit_approvals" tua ON tua."requestId" = tur.id AND tua."userId" = ${userId}
    JOIN "users" u ON u.id = tur."createdById"
    WHERE tum."userId" = ${userId}
      AND tur.status::text = 'PENDING'
    ORDER BY tur."createdAt" DESC
  `;

  return Promise.all(requests.map(async (request) => {
    const members = await prisma.$queryRaw<Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      photoUrl: string | null;
      approvalStatus: string;
    }>>`
      SELECT u.id, u."firstName", u."lastName", u.email, u."photoUrl",
             COALESCE(tua.status::text, 'PENDING') AS "approvalStatus"
      FROM "trust_unit_request_members" tum
      JOIN "users" u ON u.id = tum."userId"
      LEFT JOIN "trust_unit_approvals" tua ON tua."requestId" = tum."requestId" AND tua."userId" = tum."userId"
      WHERE tum."requestId" = ${request.id}
      ORDER BY u."firstName" ASC
    `;

    return {
      id: request.id,
      createdAt: request.createdAt,
      createdBy: {
        id: request.createdById,
        firstName: request.createdByFirstName,
        lastName: request.createdByLastName,
        email: request.createdByEmail,
        photoUrl: request.createdByPhotoUrl,
      },
      members: members.map((user) => ({ user })),
      approvals: [],
    };
  }));
}

export async function getPendingTrustRequestsSafe(userId: string) {
  try {
    return await getPendingTrustRequests(userId);
  } catch (err) {
    console.error("[trust] getPendingTrustRequests failed", err);
    return [];
  }
}

export async function getTrustUnits(userId: string) {
  const units = await prisma.$queryRaw<Array<{ id: string; createdAt: Date }>>`
    SELECT tu.id, tu."createdAt"
    FROM "trust_units" tu
    JOIN "trust_unit_members" tum ON tum."trustUnitId" = tu.id
    WHERE tu.status::text = 'ACTIVE'
      AND tum."userId" = ${userId}
    ORDER BY tu."createdAt" DESC
  `;

  return Promise.all(units.map(async (unit) => {
    const members = await prisma.$queryRaw<Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      photoUrl: string | null;
    }>>`
      SELECT u.id, u."firstName", u."lastName", u.email, u."photoUrl"
      FROM "trust_unit_members" tum
      JOIN "users" u ON u.id = tum."userId"
      WHERE tum."trustUnitId" = ${unit.id}
      ORDER BY u."firstName" ASC
    `;

    return {
      id: unit.id,
      createdAt: unit.createdAt,
      members: members.map((user) => ({ user })),
    };
  }));
}
