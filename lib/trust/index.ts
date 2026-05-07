import { prisma } from "@/lib/db/prisma";
import { TrustApprovalStatus } from "@prisma/client";
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

/**
 * Connectors eligible for “invite wedge → TU” UX — excludes the **pure sponsor star**:
 * if both parties share the same `invitedById`, that sponsor appears as a mutual graph neighbor
 * even though there is no third bond between the two invitees (only parallel downhill links).
 */
export async function findTrustUnitOpportunityConnectors(currentUserId: string, targetUserId: string): Promise<string[]> {
  const mutual = await findSharedConnections(currentUserId, targetUserId);

  const pair = await prisma.user.findMany({
    where: { id: { in: [currentUserId, targetUserId] } },
    select: { id: true, invitedById: true },
  });
  const invByMe = pair.find((u) => u.id === currentUserId)?.invitedById ?? null;
  const invByPeer = pair.find((u) => u.id === targetUserId)?.invitedById ?? null;

  if (!invByMe || invByMe !== invByPeer) {
    return mutual;
  }

  const sponsorHubId = invByMe;
  return mutual.filter((id) => id !== sponsorHubId);
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

async function loadPendingTrustRequestRowsForUser(viewerId: string) {
  return prisma.trustUnitRequest.findMany({
    where: {
      status: "PENDING",
      /** Membership alone defines eligibility; approvals row should exist but we heal if missing */
      members: { some: { userId: viewerId } },
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
}

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
  let requests = await loadPendingTrustRequestRowsForUser(userId);

  const healApprovals: Array<{ requestId: string; userId: string; status: TrustApprovalStatus }> = [];
  for (const req of requests) {
    const isMember = req.members.some((m) => m.userId === userId);
    const hasApproval = req.approvals.some((a) => a.userId === userId);
    if (isMember && !hasApproval) {
      healApprovals.push({
        requestId: req.id,
        userId,
        status: req.createdById === userId ? TrustApprovalStatus.APPROVED : TrustApprovalStatus.PENDING,
      });
    }
  }

  if (healApprovals.length > 0) {
    await prisma.trustUnitApproval
      .createMany({
        data: healApprovals,
        skipDuplicates: true,
      })
      .catch((err) => {
        console.error("[trust] heal TrustUnitApproval rows failed", err);
      });
    requests = await loadPendingTrustRequestRowsForUser(userId);
  }

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

/** Props shape for `DashboardTrustUnitGate` (member `/dashboard` + founder/admin `/admin`). */
export function serializeTrustGateRequests(
  trustRequests: Array<{
    id: string;
    createdAt: Date;
    createdBy: { id: string; firstName: string; lastName: string; email: string; photoUrl: string | null };
    members: PendingTrustRequestMember[];
  }>,
) {
  return trustRequests.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    createdBy: {
      id: r.createdBy.id,
      firstName: r.createdBy.firstName,
      lastName: r.createdBy.lastName,
      photoUrl: r.createdBy.photoUrl,
    },
    members: trustRequestMembersForClient(r.members),
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
