import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export const IC_STATUS = {
  PENDING_ACKS: "PENDING_ACKS",
  PENDING_ADMIN: "PENDING_ADMIN",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  WITHDRAWN: "WITHDRAWN",
  EXPIRED: "EXPIRED",
} as const;

export type IcStatus = (typeof IC_STATUS)[keyof typeof IC_STATUS];

export async function getActiveInviteeIds(requesterId: string): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: { invitedById: requesterId, status: "active" },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

export async function refreshAckPhase(requestId: string): Promise<void> {
  const req = await prisma.identityChangeRequest.findUnique({
    where: { id: requestId },
    include: { acknowledgments: true },
  });
  if (!req || req.status !== IC_STATUS.PENDING_ACKS) return;

  const now = new Date();
  if (now > req.expiresAt) {
    await prisma.identityChangeRequest.update({
      where: { id: requestId },
      data: {
        status: IC_STATUS.PENDING_ADMIN,
        hasConflict: true,
      },
    });
    return;
  }

  const pending = req.acknowledgments.filter((a) => a.response == null);
  if (pending.length > 0) return;

  const anyNo = req.acknowledgments.some((a) => a.response === "NO");
  await prisma.identityChangeRequest.update({
    where: { id: requestId },
    data: {
      status: IC_STATUS.PENDING_ADMIN,
      hasConflict: anyNo,
    },
  });
}

export async function refreshManyAckPhases(requestIds: string[]): Promise<void> {
  await Promise.all(requestIds.map((id) => refreshAckPhase(id)));
}

export async function applyApprovedRequest(requestId: string, adminId: string, adminNote?: string | null) {
  await prisma.$transaction(async (tx) => {
    const req = await tx.identityChangeRequest.findUnique({ where: { id: requestId } });
    if (!req || req.status !== IC_STATUS.PENDING_ADMIN) {
      throw new Error("BAD_STATE");
    }

    const dataUser: Prisma.UserUpdateInput = {};
    if (req.changeName) {
      dataUser.firstName = req.proposedFirstName!;
      dataUser.lastName = req.proposedLastName!;
    }
    if (req.changeEmail) {
      const dup = await tx.user.findFirst({
        where: { email: req.proposedEmail!, NOT: { id: req.requesterId } },
      });
      if (dup) throw new Error("EMAIL_TAKEN");
      dataUser.email = req.proposedEmail!;
      dataUser.emailVerified = false;
    }

    if (Object.keys(dataUser).length > 0) {
      await tx.user.update({ where: { id: req.requesterId }, data: dataUser });
    }

    if (req.changePhone) {
      await tx.profile.update({
        where: { userId: req.requesterId },
        data: { phone: req.proposedPhone ?? null },
      });
    }

    const requester = await tx.user.findUnique({
      where: { id: req.requesterId },
      select: { selfServiceIdentityChangesRemaining: true },
    });
    const rem = requester?.selfServiceIdentityChangesRemaining ?? 0;
    await tx.user.update({
      where: { id: req.requesterId },
      data: { selfServiceIdentityChangesRemaining: Math.max(0, rem - 1) },
    });

    await tx.identityChangeRequest.update({
      where: { id: requestId },
      data: {
        status: IC_STATUS.APPROVED,
        resolvedAt: new Date(),
        adminId,
        adminNote: adminNote ?? null,
      },
    });
  });
}
