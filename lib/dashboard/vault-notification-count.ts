// Dashboard + sidebar — actionable Msg Vault signals (badge count).

import { prisma } from "@/lib/db/prisma";
import { getPendingTrustRequestsSafe } from "@/lib/trust";

/**
 * Items that should surface a Msg Vault notification badge:
 * - Pending trust formation / gate requests (same source as dashboard trust gate)
 * - Pending AIH governance approvals where this user is the approver
 * - Pending invites tied to trust-unit formation (`trustUnitPendingSlots`)
 *
 * Extend with unread vault messages when that signal exists (currently 0).
 */
export async function getVaultNotificationCount(userId: string): Promise<number> {
  const now = new Date();

  const [trustGatePending, guardianApprovals, pendingTrustInvites] = await Promise.all([
    getPendingTrustRequestsSafe(userId).then((rows) => rows.length),
    prisma.aihApprovalRequest.count({
      where: {
        approverId: userId,
        state:      "pending",
        expiresAt:  { gt: now },
      },
    }),
    prisma.invite.count({
      where: {
        senderId: userId,
        status:   "PENDING",
        expiresAt: { gt: now },
        trustUnitPendingSlots: { some: {} },
      },
    }),
  ]);

  const unreadVaultMessages = 0;

  return trustGatePending + guardianApprovals + pendingTrustInvites + unreadVaultMessages;
}
