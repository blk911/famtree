/**
 * Detect and repair corrupt / stale Trust Unit proposals + pending invite slots.
 * Run via npm run trust:repair-pending or automatically before listing pending TUs.
 */

import { prisma } from "@/lib/db/prisma";
import { TrustApprovalStatus, TrustUnitRequestStatus } from "@prisma/client";
import { resolveTrustUnitPendingInvitesOnRegister } from "./tuProposal";

export type TrustProposalRepairIssue = {
  kind:
    | "orphan_slot"
    | "sender_mismatch"
    | "terminal_invite"
    | "expired_invite"
    | "registered_invite_unresolved"
    | "creator_missing_photo"
    | "underfilled_after_cleanup";
  requestId: string;
  inviteId?: string;
  detail: string;
};

export type TrustProposalRepairResult = {
  issues: TrustProposalRepairIssue[];
  slotsRemoved: number;
  requestsCancelled: number;
  invitesExpired: number;
  invitesPromoted: number;
};

function isInviteTerminal(status: string): boolean {
  return status === "EXPIRED" || status === "CANCELLED";
}

/**
 * Repair all PENDING trust unit requests (site-wide). Safe to run on each dashboard load.
 * When dryRun is true, only reports issues without writes.
 */
export async function repairStalePendingTrustProposals(opts?: {
  dryRun?: boolean;
}): Promise<TrustProposalRepairResult> {
  const dryRun = opts?.dryRun ?? false;
  const now = new Date();
  const issues: TrustProposalRepairIssue[] = [];
  let slotsRemoved = 0;
  let requestsCancelled = 0;
  let invitesExpired = 0;
  let invitesPromoted = 0;

  const pending = await prisma.trustUnitRequest.findMany({
    where: { status: "PENDING" },
    include: {
      createdBy: { select: { id: true, email: true, photoUrl: true, firstName: true, lastName: true } },
      members: { select: { userId: true } },
      pendingInviteSlots: true,
    },
  });

  for (const req of pending) {
    let slotsDeletedThisRequest = 0;

    for (const slot of req.pendingInviteSlots) {
      const invite = await prisma.invite.findUnique({
        where: { id: slot.inviteId },
        select: {
          id: true,
          senderId: true,
          recipientEmail: true,
          status: true,
          expiresAt: true,
        },
      });

      if (!invite) {
        issues.push({
          kind: "orphan_slot",
          requestId: req.id,
          inviteId: slot.inviteId,
          detail: `Pending slot references missing invite ${slot.inviteId}`,
        });
        if (!dryRun) {
          await prisma.trustUnitRequestPendingInvite.delete({ where: { id: slot.id } });
          slotsRemoved++;
          slotsDeletedThisRequest++;
        }
        continue;
      }

      if (invite.senderId !== req.createdById) {
        issues.push({
          kind: "sender_mismatch",
          requestId: req.id,
          inviteId: invite.id,
          detail: `Invite sender ${invite.senderId} ≠ proposal creator ${req.createdById} (${invite.recipientEmail})`,
        });
        if (!dryRun) {
          await prisma.trustUnitRequestPendingInvite.delete({ where: { id: slot.id } });
          slotsRemoved++;
          slotsDeletedThisRequest++;
        }
        continue;
      }

      if (invite.status === "REGISTERED") {
        issues.push({
          kind: "registered_invite_unresolved",
          requestId: req.id,
          inviteId: invite.id,
          detail: `Invite REGISTERED but still in pending slot (${invite.recipientEmail})`,
        });
        if (!dryRun) {
          const user = await prisma.user.findFirst({
            where: { email: { equals: invite.recipientEmail, mode: "insensitive" } },
            select: { id: true },
          });
          if (user) {
            await resolveTrustUnitPendingInvitesOnRegister(user.id, invite.id);
            invitesPromoted++;
          } else {
            await prisma.trustUnitRequestPendingInvite.delete({ where: { id: slot.id } });
            slotsRemoved++;
            slotsDeletedThisRequest++;
          }
        }
        continue;
      }

      if (isInviteTerminal(invite.status)) {
        issues.push({
          kind: "terminal_invite",
          requestId: req.id,
          inviteId: invite.id,
          detail: `Invite status ${invite.status} (${invite.recipientEmail})`,
        });
        if (!dryRun) {
          await prisma.trustUnitRequestPendingInvite.delete({ where: { id: slot.id } });
          slotsRemoved++;
          slotsDeletedThisRequest++;
        }
        continue;
      }

      if (invite.status === "PENDING" && invite.expiresAt < now) {
        issues.push({
          kind: "expired_invite",
          requestId: req.id,
          inviteId: invite.id,
          detail: `Invite past expiresAt (${invite.recipientEmail})`,
        });
        if (!dryRun) {
          await prisma.invite.update({
            where: { id: invite.id },
            data: { status: "EXPIRED" },
          });
          invitesExpired++;
          await prisma.trustUnitRequestPendingInvite.delete({ where: { id: slot.id } });
          slotsRemoved++;
          slotsDeletedThisRequest++;
        }
        continue;
      }

      if (!req.createdBy.photoUrl?.trim()) {
        issues.push({
          kind: "creator_missing_photo",
          requestId: req.id,
          inviteId: invite.id,
          detail: `Proposal creator has no photo — invitee cannot complete identity challenge (${invite.recipientEmail})`,
        });
        if (!dryRun) {
          await prisma.trustUnitRequestPendingInvite.delete({ where: { id: slot.id } });
          slotsRemoved++;
          slotsDeletedThisRequest++;
        }
        continue;
      }
    }

    if (slotsDeletedThisRequest > 0 && !dryRun) {
      const refreshed = await prisma.trustUnitRequest.findUnique({
        where: { id: req.id },
        include: { members: true, pendingInviteSlots: true },
      });
      const total =
        (refreshed?.members.length ?? 0) + (refreshed?.pendingInviteSlots.length ?? 0);
      if (total < 3) {
        issues.push({
          kind: "underfilled_after_cleanup",
          requestId: req.id,
          detail: `Proposal has ${total} participants after removing stale slots`,
        });
        await prisma.$transaction([
          prisma.trustUnitApproval.updateMany({
            where: { requestId: req.id },
            data: { status: TrustApprovalStatus.DECLINED },
          }),
          prisma.trustUnitRequest.update({
            where: { id: req.id },
            data: { status: TrustUnitRequestStatus.DECLINED },
          }),
        ]);
        requestsCancelled++;
      }
    }
  }

  return {
    issues,
    slotsRemoved,
    requestsCancelled,
    invitesExpired,
    invitesPromoted,
  };
}
