import { prisma } from "@/lib/db/prisma";
import { accessDenied, notFound } from "@/lib/msg-vault/errors";
import type { AihMsgParticipant } from "@prisma/client";

const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  photoUrl: true,
} as const;

export const PARTICIPANT_INCLUDE = {
  user: { select: USER_SELECT },
} as const;

export async function requireActiveParticipant(
  userId: string,
  conversationId: string,
): Promise<AihMsgParticipant> {
  const row = await prisma.aihMsgParticipant.findUnique({
    where: {
      conversationId_userId: { conversationId, userId },
    },
  });

  if (!row) {
    throw notFound("Conversation not found.");
  }
  if (row.status !== "ACTIVE") {
    throw accessDenied("You are not an active participant in this conversation.");
  }
  return row;
}

export async function loadConversationForParticipant(
  userId: string,
  conversationId: string,
) {
  await requireActiveParticipant(userId, conversationId);

  const conversation = await prisma.aihMsgConversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: {
        where: { status: "ACTIVE" },
        include: PARTICIPANT_INCLUDE,
        orderBy: { joinedAt: "asc" },
      },
      trustUnit: {
        include: { aihMeta: true },
      },
    },
  });

  if (!conversation) {
    throw notFound();
  }
  return conversation;
}

export async function assertTargetUserActive(targetUserId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, status: true },
  });
  if (!user || user.status !== "active") {
    throw notFound("That person is not available for messaging.");
  }
}
