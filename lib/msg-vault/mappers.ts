import type {
  AihMsgConversation,
  AihMsgMessage,
  AihMsgNotice,
  AihMsgParticipant,
  User,
} from "@prisma/client";
import type {
  MsgConversationDTO,
  MsgMessageDTO,
  MsgNoticeDTO,
  MsgParticipantDTO,
} from "@/types/msg-vault";

type ParticipantWithUser = AihMsgParticipant & {
  user?: Pick<User, "id" | "firstName" | "lastName" | "photoUrl"> | null;
};

type MessageWithAuthor = AihMsgMessage & {
  author?: Pick<User, "id" | "firstName" | "lastName" | "photoUrl"> | null;
};

export function toParticipantDTO(row: ParticipantWithUser): MsgParticipantDTO {
  return {
    id:             row.id,
    conversationId: row.conversationId,
    userId:         row.userId,
    role:           row.role,
    status:         row.status,
    joinedAt:       row.joinedAt.toISOString(),
    lastReadAt:     row.lastReadAt?.toISOString() ?? null,
    mutedAt:        row.mutedAt?.toISOString() ?? null,
    ...(row.user
      ? {
          user: {
            id:        row.user.id,
            firstName: row.user.firstName,
            lastName:  row.user.lastName,
            photoUrl:  row.user.photoUrl,
          },
        }
      : {}),
  };
}

export function toConversationDTO(
  row: AihMsgConversation,
  participants?: ParticipantWithUser[],
): MsgConversationDTO {
  return {
    id:              row.id,
    kind:            row.kind,
    title:           row.title,
    createdById:     row.createdById,
    trustUnitId:     row.trustUnitId,
    directKey:       row.directKey,
    visibilityScope: row.visibilityScope,
    status:          row.status,
    lastMessageAt:   row.lastMessageAt?.toISOString() ?? null,
    createdAt:       row.createdAt.toISOString(),
    updatedAt:       row.updatedAt.toISOString(),
    ...(participants ? { participants: participants.map(toParticipantDTO) } : {}),
  };
}

export function toMessageDTO(row: MessageWithAuthor): MsgMessageDTO {
  return {
    id:               row.id,
    conversationId:   row.conversationId,
    authorId:         row.authorId,
    bodyText:         row.bodyText,
    status:           row.status,
    governanceState:  row.governanceState,
    escalationState:  row.escalationState,
    createdAt:        row.createdAt.toISOString(),
    updatedAt:        row.updatedAt.toISOString(),
    deletedAt:        row.deletedAt?.toISOString() ?? null,
    ...(row.author
      ? {
          author: {
            id:        row.author.id,
            firstName: row.author.firstName,
            lastName:  row.author.lastName,
            photoUrl:  row.author.photoUrl,
          },
        }
      : {}),
  };
}

export function toNoticeDTO(row: AihMsgNotice): MsgNoticeDTO {
  return {
    id:                row.id,
    userId:            row.userId,
    conversationId:    row.conversationId,
    trustUnitId:       row.trustUnitId,
    approvalRequestId: row.approvalRequestId,
    kind:              row.kind,
    title:             row.title,
    body:              row.body,
    status:            row.status,
    createdAt:         row.createdAt.toISOString(),
    readAt:            row.readAt?.toISOString() ?? null,
  };
}
