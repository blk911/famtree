/**
 * Admin permanent member removal — clears Restrict FK rows added after initial wiring
 * (Msg Vault, AIH Safe, etc.) before deleting the User.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export async function deleteMemberAccount(
  userId: string,
  tx: Prisma.TransactionClient = prisma,
): Promise<void> {
  // Msg Vault — governance + messages
  await tx.aihMsgGovernanceEvent.deleteMany({ where: { actorUserId: userId } });

  const authoredMessageIds = await tx.aihMsgMessage.findMany({
    where: { authorId: userId },
    select: { id: true },
  });
  if (authoredMessageIds.length > 0) {
    await tx.aihMsgGovernanceEvent.deleteMany({
      where: { messageId: { in: authoredMessageIds.map((m) => m.id) } },
    });
    await tx.aihMsgMessage.deleteMany({ where: { authorId: userId } });
  }

  // Conversations this user created — reassign or remove empty shells
  const createdConversations = await tx.aihMsgConversation.findMany({
    where: { createdById: userId },
    select: { id: true },
  });
  for (const { id: conversationId } of createdConversations) {
    const successor = await tx.aihMsgParticipant.findFirst({
      where: {
        conversationId,
        userId: { not: userId },
        status: "ACTIVE",
      },
      orderBy: { joinedAt: "asc" },
      select: { userId: true },
    });
    if (successor) {
      await tx.aihMsgConversation.update({
        where: { id: conversationId },
        data: { createdById: successor.userId },
      });
    } else {
      await tx.aihMsgGovernanceEvent.deleteMany({ where: { conversationId } });
      await tx.aihMsgMessage.deleteMany({ where: { conversationId } });
      await tx.aihMsgParticipant.deleteMany({ where: { conversationId } });
      await tx.aihMsgNotice.deleteMany({ where: { conversationId } });
      await tx.aihMsgConversation.delete({ where: { id: conversationId } });
    }
  }

  await tx.aihMsgParticipant.deleteMany({ where: { userId } });
  await tx.aihMsgNotice.deleteMany({ where: { userId } });

  // AIH Safe activity + approvals + guardian links
  await tx.aihActivityComment.deleteMany({ where: { authorId: userId } });
  await tx.aihActivityPost.deleteMany({ where: { authorId: userId } });
  await tx.aihApprovalRequest.deleteMany({
    where: { OR: [{ requestorId: userId }, { approverId: userId }] },
  });
  await tx.aihGuardianRelationship.deleteMany({
    where: { OR: [{ guardianUserId: userId }, { childUserId: userId }] },
  });

  const familyUnitsCreated = await tx.aihFamilyUnit.findMany({
    where: { createdByUserId: userId },
    select: { id: true },
  });
  for (const { id: familyUnitId } of familyUnitsCreated) {
    await tx.aihFamilyUnitMember.deleteMany({ where: { familyUnitId } });
    await tx.aihFamilyUnit.delete({ where: { id: familyUnitId } });
  }
  await tx.aihFamilyUnitMember.deleteMany({ where: { userId } });

  // Legacy invites + auth
  await tx.invite.deleteMany({ where: { senderId: userId } });
  await tx.passwordResetToken.deleteMany({ where: { userId } });
  await tx.session.deleteMany({ where: { userId } });

  await tx.user.delete({ where: { id: userId } });
}
