// Msg Vault — per-participant archive / resume (Agent 109).

import { prisma } from "@/lib/db/prisma";
import { requireActiveParticipant, PARTICIPANT_INCLUDE } from "@/lib/msg-vault/access";
import { toConversationDTO } from "@/lib/msg-vault/mappers";
import type { MsgConversationDTO } from "@/types/msg-vault";

export async function archiveConversationForUser(
  userId: string,
  conversationId: string,
): Promise<MsgConversationDTO> {
  await requireActiveParticipant(userId, conversationId);
  const row = await prisma.aihMsgParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { archivedAt: new Date() },
    include: {
      conversation: {
        include: {
          participants: { where: { status: "ACTIVE" }, include: PARTICIPANT_INCLUDE, take: 8 },
        },
      },
    },
  });
  return {
    ...toConversationDTO(row.conversation, row.conversation.participants),
    archivedForViewer: true,
  };
}

export async function resumeConversationForUser(
  userId: string,
  conversationId: string,
): Promise<MsgConversationDTO> {
  await requireActiveParticipant(userId, conversationId);
  const row = await prisma.aihMsgParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { archivedAt: null },
    include: {
      conversation: {
        include: {
          participants: { where: { status: "ACTIVE" }, include: PARTICIPANT_INCLUDE, take: 8 },
        },
      },
    },
  });
  return {
    ...toConversationDTO(row.conversation, row.conversation.participants),
    archivedForViewer: false,
  };
}
