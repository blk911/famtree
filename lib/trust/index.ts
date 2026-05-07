import { prisma } from "@/lib/db/prisma";
import { buildTrustAdjacency } from "./adjacency";
import { maskInviteEmail } from "./tuProposal";

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  photoUrl: true,
} as const;

export async function findSharedConnections(currentUserId: string, targetUserId: string) {
  const adjacency = await buildTrustAdjacency();
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

export type PendingTrustRequestMember =
  | {
      user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        photoUrl: string | null;
        approvalStatus: string;
      };
    }
  | {
      pendingInvite: { id: string; recipientEmail: string; status: string };
      approvalStatus: "WAITING_ON_JOIN";
    };

export async function getPendingTrustRequests(userId: string): Promise<Array<{
  id: string;
  createdAt: Date;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    photoUrl: string | null;
  };
  members: PendingTrustRequestMember[];
  approvals: unknown[];
}>> {
  const requests = await prisma.trustUnitRequest.findMany({
    where: {
      status: "PENDING",
      members: { some: { userId } },
      approvals: { some: { userId } },
    },
    include: {
      createdBy: { select: userSelect },
      members: {
        include: { user: { select: userSelect } },
        orderBy: { user: { firstName: "asc" } },
      },
      pendingInviteSlots: {
        include: {
          invite: { select: { id: true, recipientEmail: true, status: true } },
        },
      },
      approvals: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return requests.map((req) => {
    const approvalByUser = new Map(req.approvals.map((a) => [a.userId, a.status]));

    const registeredRows: PendingTrustRequestMember[] = req.members.map((m) => ({
      user: {
        ...m.user,
        approvalStatus: approvalByUser.get(m.userId) ?? "PENDING",
      },
    }));

    const pendingRows: PendingTrustRequestMember[] = req.pendingInviteSlots.map((slot) => ({
      pendingInvite: {
        id: slot.invite.id,
        recipientEmail: maskInviteEmail(slot.invite.recipientEmail),
        status: slot.invite.status,
      },
      approvalStatus: "WAITING_ON_JOIN",
    }));

    return {
      id: req.id,
      createdAt: req.createdAt,
      createdBy: req.createdBy,
      members: [...registeredRows, ...pendingRows],
      approvals: [],
    };
  });
}

export type TrustRequestMemberForClient = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  approvalStatus: string;
  pendingInvite?: boolean;
};

/** Flatten server-side TU member union for dashboard / family-units client components. */
export function trustRequestMembersForClient(members: PendingTrustRequestMember[]): TrustRequestMemberForClient[] {
  const out: TrustRequestMemberForClient[] = [];
  for (const m of members) {
    if ("pendingInvite" in m) {
      out.push({
        id: `pending:${m.pendingInvite.id}`,
        firstName: m.pendingInvite.recipientEmail,
        lastName: "",
        photoUrl: null,
        approvalStatus: m.approvalStatus,
        pendingInvite: true,
      });
    } else {
      out.push({
        id: m.user.id,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        photoUrl: m.user.photoUrl,
        approvalStatus: m.user.approvalStatus ?? "PENDING",
        pendingInvite: false,
      });
    }
  }
  return out;
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

/** Accepted bonds for viewer: peer user + when the row last moved to ACCEPTED (`updatedAt`). */
export async function getAcceptedBondDetails(userId: string) {
  const rows = await prisma.connectionRequest.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { targetId: userId }],
    },
    select: {
      updatedAt: true,
      requesterId: true,
      targetId: true,
      requester: { select: userSelect },
      target: { select: userSelect },
    },
    orderBy: { updatedAt: "desc" },
  });

  return rows.map((r) => ({
    peer: r.requesterId === userId ? r.target : r.requester,
    bondedAt: r.updatedAt,
  }));
}

/** Peers linked by an ACCEPTED connection_request (either direction). */
export async function getAcceptedBondPeers(userId: string) {
  const details = await getAcceptedBondDetails(userId);
  return details.map((d) => d.peer);
}

export async function getAcceptedBondPeersSafe(userId: string) {
  try {
    return await getAcceptedBondPeers(userId);
  } catch (err) {
    console.error("[trust] getAcceptedBondPeers failed", err);
    return [];
  }
}

export async function getAcceptedBondDetailsSafe(userId: string) {
  try {
    return await getAcceptedBondDetails(userId);
  } catch (err) {
    console.error("[trust] getAcceptedBondDetails failed", err);
    return [];
  }
}
