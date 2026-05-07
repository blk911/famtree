import { prisma } from "@/lib/db/prisma";
import { TrustApprovalStatus } from "@prisma/client";
import { buildTrustAdjacency, pickFirstNeighbor } from "./adjacency";

export function maskInviteEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  if (at <= 0) return "***";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const a = local.charAt(0) || "?";
  const d0 = domain.charAt(0) || "?";
  return `${a}***@${d0}***`;
}

export async function createTrustUnitProposal(opts: {
  createdById: string;
  registeredMemberIds: string[];
  pendingInviteIds?: string[];
}): Promise<string> {
  const { createdById, pendingInviteIds = [] } = opts;
  const uniqReg = Array.from(new Set(opts.registeredMemberIds));
  if (!uniqReg.includes(createdById)) {
    throw new Error("Trust Units require the creator among registered members");
  }
  const total = uniqReg.length + pendingInviteIds.length;
  if (total < 3 || total > 20) {
    throw new Error("Trust Units require 3–20 members including pending invites");
  }

  const row = await prisma.trustUnitRequest.create({
    data: {
      createdById,
      status: "PENDING",
      members: {
        create: uniqReg.map((userId) => ({ userId })),
      },
      approvals: {
        create: uniqReg.map((userId) => ({
          userId,
          status: userId === createdById ? TrustApprovalStatus.APPROVED : TrustApprovalStatus.PENDING,
        })),
      },
      pendingInviteSlots:
        pendingInviteIds.length > 0
          ? { create: pendingInviteIds.map((inviteId) => ({ inviteId })) }
          : undefined,
    },
    select: { id: true },
  });

  return row.id;
}

/** After POST /api/invite for a brand-new invite row — sponsor + first neighbor + pending invitee slot. */
export async function tryAutoTrustUnitAfterInvite(senderId: string, inviteId: string): Promise<string | null> {
  const existing = await prisma.trustUnitRequestPendingInvite.findUnique({ where: { inviteId } });
  if (existing) return null;

  const adjacency = await buildTrustAdjacency();
  const blk = pickFirstNeighbor(senderId, adjacency);
  if (!blk) return null;

  const uniqReg = Array.from(new Set([senderId, blk]));
  try {
    return await createTrustUnitProposal({
      createdById: senderId,
      registeredMemberIds: uniqReg,
      pendingInviteIds: [inviteId],
    });
  } catch (e) {
    console.error("[trust] tryAutoTrustUnitAfterInvite", e);
    return null;
  }
}

/** When an invite becomes REGISTERED, promote pending TU slots into real members + pending approvals. */
export async function resolveTrustUnitPendingInvitesOnRegister(userId: string, inviteId: string): Promise<void> {
  const slots = await prisma.trustUnitRequestPendingInvite.findMany({ where: { inviteId } });
  for (const slot of slots) {
    try {
      await prisma.$transaction([
        prisma.trustUnitRequestMember.create({
          data: { requestId: slot.requestId, userId },
        }),
        prisma.trustUnitApproval.create({
          data: {
            requestId: slot.requestId,
            userId,
            status: TrustApprovalStatus.PENDING,
          },
        }),
        prisma.trustUnitRequestPendingInvite.delete({ where: { id: slot.id } }),
      ]);
    } catch (err) {
      console.error("[trust] resolveTrustUnitPendingInvitesOnRegister", err);
    }
  }
}
