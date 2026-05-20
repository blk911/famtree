import { prisma } from "@/lib/db/prisma";
import { TrustApprovalStatus, TrustUnitRequestStatus } from "@prisma/client";
import { buildTrustAdjacency } from "./adjacency";
import { normalizeInviteEmail } from "@/lib/invite";
import { maskInviteEmail } from "./tuProposal";
import { repairStalePendingTrustProposals } from "./repairPendingProposals";
import { filterHumanTrustEligibleUserIds, isHumanTrustEligible, loadHumanEligibleUserIdSet } from "./isHumanTrustEligible";

export {
  TRUST_CIRCLES_EMPTY_HINT,
  TRUST_CIRCLES_EMPTY_TITLE,
  countDraftTrustUnits,
  getActiveMemberUserIds,
  getActiveTrustUnits,
  getDraftTrustUnits,
  getDraftTrustUnitsForDisplay,
  isSelfOnlyTrustUnit,
  partitionTrustUnits,
  trustUnitMemberUserId,
} from "./display";
export type { TrustUnitLike, TrustUnitMemberLike } from "./display";

export {
  ADMIN_HUMAN_TRUST_MESSAGE,
  isHumanTrustEligible,
  isHumanTrustEligibleActor,
  filterHumanTrustEligibleUserIds,
  loadHumanEligibleUserIdSet,
} from "./isHumanTrustEligible";

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

/** Drop shared sponsor id from mutual-neighbor list when both users were invited by them. */
async function filterMutualIdsForTrustUnitWedge(mutual: string[], userIdA: string, userIdB: string): Promise<string[]> {
  const pair = await prisma.user.findMany({
    where: { id: { in: [userIdA, userIdB] } },
    select: { id: true, invitedById: true },
  });
  const invByMe = pair.find((u) => u.id === userIdA)?.invitedById ?? null;
  const invByPeer = pair.find((u) => u.id === userIdB)?.invitedById ?? null;

  if (!invByMe || invByMe !== invByPeer) {
    return mutual;
  }

  const sponsorHubId = invByMe;
  return mutual.filter((id) => id !== sponsorHubId);
}

/** Same adjacency-based mutuals as {@link findSharedConnections}, then sponsor-only-star strip for wedge UX. */
export async function findTrustUnitOpportunityConnectors(currentUserId: string, targetUserId: string): Promise<string[]> {
  const mutual = await findSharedConnections(currentUserId, targetUserId);
  const wedge = await filterMutualIdsForTrustUnitWedge(mutual, currentUserId, targetUserId);
  return filterHumanTrustEligibleUserIds(wedge);
}

function rawMutualNeighborIds(adj: Map<string, Set<string>>, userIdA: string, userIdB: string): string[] {
  const ca = adj.get(userIdA) ?? new Set<string>();
  const cb = adj.get(userIdB) ?? new Set<string>();
  return Array.from(ca).filter((id) => id !== userIdB && cb.has(id));
}

/** True when exactly-three registered members are only “joined” via stripped sponsor-hub mutual (legacy bad rows). */
async function registeredTripletIsSponsorOnlyStar(memberIds: string[]): Promise<boolean> {
  if (memberIds.length !== 3) return false;
  const adj = await buildTrustAdjacency();
  const pairs: Array<[number, number]> = [
    [0, 1],
    [0, 2],
    [1, 2],
  ];
  for (const [i, j] of pairs) {
    const a = memberIds[i]!;
    const b = memberIds[j]!;
    const raw = rawMutualNeighborIds(adj, a, b);
    if (raw.length === 0) continue;
    const wedge = await filterMutualIdsForTrustUnitWedge(raw, a, b);
    if (wedge.length === 0) return true;
  }
  return false;
}

async function systemDeclineSponsorOnlyTrustRequest(requestId: string): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.trustUnitApproval.updateMany({
        where: { requestId },
        data: { status: TrustApprovalStatus.DECLINED },
      });
      await tx.trustUnitRequestPendingInvite.deleteMany({ where: { requestId } });
      await tx.trustUnitRequest.update({
        where: { id: requestId },
        data: { status: TrustUnitRequestStatus.DECLINED },
      });
    });
  } catch (err) {
    console.error("[trust] systemDeclineSponsorOnlyTrustRequest", requestId, err);
  }
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
      pendingInvite: {
        id: string;
        recipientEmail: string;
        recipientEmailMasked: string;
        status: string;
      };
      approvalStatus: "WAITING_ON_JOIN";
    };

async function excludePendingTuWithIneligibleParticipants<
  T extends { createdById: string; members: Array<{ userId: string }> },
>(requests: T[]): Promise<T[]> {
  if (requests.length === 0) return [];
  const ids = new Set<string>();
  for (const r of requests) {
    ids.add(r.createdById);
    for (const m of r.members) ids.add(m.userId);
  }
  const rows = await prisma.user.findMany({
    where: { id: { in: Array.from(ids) } },
    select: { id: true, role: true, email: true },
  });
  const ok = new Set(rows.filter((u) => isHumanTrustEligible(u)).map((u) => u.id));
  return requests.filter((r) => {
    if (!ok.has(r.createdById)) return false;
    return r.members.every((m) => ok.has(m.userId));
  });
}

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

/** Site-wide cleanup — fire-and-forget before loading viewer's pending list. */
async function repairPendingTrustProposalsBestEffort(): Promise<void> {
  try {
    const result = await repairStalePendingTrustProposals({ dryRun: false });
    if (result.issues.length > 0) {
      console.warn("[trust] repairStalePendingTrustProposals", {
        issues: result.issues.length,
        slotsRemoved: result.slotsRemoved,
        requestsCancelled: result.requestsCancelled,
        invitesExpired: result.invitesExpired,
        invitesPromoted: result.invitesPromoted,
      });
    }
  } catch (err) {
    console.error("[trust] repairStalePendingTrustProposals failed", err);
  }
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
  await repairPendingTrustProposalsBestEffort();

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

  const kept: typeof requests = [];
  for (const req of requests) {
    const regIds = req.members.map((m) => m.userId);
    if (req.pendingInviteSlots.length > 0 || regIds.length !== 3) {
      kept.push(req);
      continue;
    }
    if (await registeredTripletIsSponsorOnlyStar(regIds)) {
      console.warn("[trust] auto-declining legacy sponsor-only-star request", req.id);
      await systemDeclineSponsorOnlyTrustRequest(req.id);
      continue;
    }
    kept.push(req);
  }
  requests = kept;

  requests = await excludePendingTuWithIneligibleParticipants(requests);

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
        recipientEmail: slot.invite.recipientEmail,
        recipientEmailMasked: maskInviteEmail(slot.invite.recipientEmail),
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
export function trustRequestMembersForClient(
  members: PendingTrustRequestMember[],
  opts?: { viewerUserId?: string; createdById?: string },
): TrustRequestMemberForClient[] {
  const viewerIsCreator =
    !!opts?.viewerUserId && !!opts?.createdById && opts.viewerUserId === opts.createdById;
  const out: TrustRequestMemberForClient[] = [];
  for (const m of members) {
    if ("pendingInvite" in m) {
      const label = viewerIsCreator
        ? m.pendingInvite.recipientEmail
        : m.pendingInvite.recipientEmailMasked;
      out.push({
        id: `pending:${m.pendingInvite.id}`,
        firstName: label,
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
  viewerUserId?: string,
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
    members: trustRequestMembersForClient(r.members, {
      viewerUserId,
      createdById: r.createdBy.id,
    }),
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

/**
 * Accepted bonds for viewer: `connection_request` ACCEPTED rows, plus sponsor↔member edges implied by
 * REGISTERED/ACCEPTED invites or `invitedById` when no connection row exists (legacy registrations or
 * email drift vs `invites.recipientEmail`). Matches edges already counted in {@link buildTrustAdjacency}.
 */
export async function getAcceptedBondDetails(userId: string) {
  const viewerRow = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true },
  });
  if (!viewerRow || !isHumanTrustEligible({ role: viewerRow.role, email: viewerRow.email })) {
    return [];
  }

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

  type Detail = { peer: (typeof rows)[number]["requester"]; bondedAt: Date };
  const byPeerId = new Map<string, Detail>();

  for (const r of rows) {
    const peer = r.requesterId === userId ? r.target : r.requester;
    byPeerId.set(peer.id, { peer, bondedAt: r.updatedAt });
  }

  const syntheticTimes = new Map<string, Date>();

  const bumpSynthetic = (peerId: string, at: Date) => {
    if (byPeerId.has(peerId)) return;
    const prev = syntheticTimes.get(peerId);
    if (!prev || at > prev) syntheticTimes.set(peerId, at);
  };

  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true, invitedById: true, createdAt: true },
  });
  const emailToId = new Map(allUsers.map((u) => [normalizeInviteEmail(u.email), u.id]));
  const userById = new Map(allUsers.map((u) => [u.id, u]));

  const invites = await prisma.invite.findMany({
    where: { status: { in: ["ACCEPTED", "REGISTERED"] } },
    select: { senderId: true, recipientEmail: true, acceptedAt: true, createdAt: true },
  });

  const eligIds = await loadHumanEligibleUserIdSet();

  for (const inv of invites) {
    const recipientId = emailToId.get(normalizeInviteEmail(inv.recipientEmail));
    if (!recipientId) continue;
    const sponsorId = inv.senderId;
    if (!eligIds.has(sponsorId) || !eligIds.has(recipientId)) continue;
    const viewerPeer =
      sponsorId === userId ? recipientId : recipientId === userId ? sponsorId : null;
    if (!viewerPeer) continue;
    const at = inv.acceptedAt ?? inv.createdAt;
    bumpSynthetic(viewerPeer, at);
  }

  const viewer = userById.get(userId);
  if (viewer?.invitedById && eligIds.has(viewer.invitedById)) {
    bumpSynthetic(viewer.invitedById, viewer.createdAt);
  }
  for (const u of allUsers) {
    if (u.invitedById === userId && eligIds.has(u.id)) {
      bumpSynthetic(u.id, u.createdAt);
    }
  }

  const missingPeerIds = Array.from(syntheticTimes.keys()).filter((id) => !byPeerId.has(id));
  if (missingPeerIds.length > 0) {
    const peers = await prisma.user.findMany({
      where: { id: { in: missingPeerIds } },
      select: userSelect,
    });
    for (const peer of peers) {
      const bondedAt = syntheticTimes.get(peer.id);
      if (bondedAt) {
        byPeerId.set(peer.id, { peer, bondedAt });
      }
    }
  }

  const sorted = Array.from(byPeerId.values()).sort((a, b) => b.bondedAt.getTime() - a.bondedAt.getTime());
  const peerIds = sorted.map((d) => d.peer.id);
  const okPeers = new Set(await filterHumanTrustEligibleUserIds(peerIds));
  return sorted.filter((d) => okPeers.has(d.peer.id));
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
