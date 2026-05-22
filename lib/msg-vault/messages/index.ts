// Msg Vault — message services (Agent 50).

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { buildActorContext } from "@/lib/aihsafe/context/buildActorContext";
import { asAIHUserId } from "@/types/aihsafe/ids";
import { requireActiveParticipant } from "@/lib/msg-vault/access";
import { validationError, accessDenied } from "@/lib/msg-vault/errors";
import { toMessageDTO } from "@/lib/msg-vault/mappers";
import { resolveVaultAttachment } from "@/lib/msg-vault/attachments";
import { assertCanSendMessage } from "@/lib/msg-vault/policy";
import { uploadFile } from "@/lib/storage";
import type { MsgAttachmentDTO } from "@/types/msg-vault/attachment";
import { createNotice } from "@/lib/msg-vault/notices";
import type { MsgMessageDTO, SendMessageInput } from "@/types/msg-vault";
import { MsgNoticeKind } from "@/types/msg-vault";

const AUTHOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  photoUrl: true,
} as const;

export interface ListMessagesOptions {
  cursor?: string;
  limit?: number;
}

export async function listMessages(
  conversationId: string,
  userId: string,
  options: ListMessagesOptions = {},
): Promise<{ items: MsgMessageDTO[]; cursor: string | null; hasMore: boolean }> {
  await requireActiveParticipant(userId, conversationId);

  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);

  const rows = await prisma.aihMsgMessage.findMany({
    where: {
      conversationId,
      deletedAt: null,
      status: { in: ["SENT", "PENDING_APPROVAL"] },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    include: { author: { select: AUTHOR_SELECT } },
  });

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return {
    items: items.map(toMessageDTO),
    cursor: hasMore ? items[items.length - 1].id : null,
    hasMore,
  };
}

export async function sendMessage(
  actorUserId: string,
  conversationId: string,
  input: SendMessageInput,
): Promise<MsgMessageDTO> {
  const participant = await requireActiveParticipant(actorUserId, conversationId);

  const conversation = await prisma.aihMsgConversation.findUnique({
    where: { id: conversationId },
    select: { id: true, status: true },
  });
  if (!conversation) {
    throw validationError("Conversation not found.");
  }
  if (conversation.status === "ARCHIVED" || conversation.status === "LOCKED") {
    throw accessDenied("This conversation is closed.");
  }
  if (conversation.status === "PENDING_APPROVAL") {
    throw accessDenied("This conversation is waiting for approval.");
  }
  if (participant.archivedAt) {
    throw accessDenied("Resume this chat before sending new messages.");
  }

  const bodyText = (input.bodyText ?? "").trim();
  const attachments = input.attachments ?? [];
  if (!bodyText && attachments.length === 0) {
    throw validationError("Message must include text or an attachment.");
  }

  const actor = await buildActorContext(asAIHUserId(actorUserId));
  if (bodyText) {
    await assertCanSendMessage(actor, bodyText);
  } else {
    await assertCanSendMessage(actor, "[attachment]");
  }

  const message = await prisma.$transaction(async (tx) => {
    const row = await tx.aihMsgMessage.create({
      data: {
        conversationId,
        authorId:  actorUserId,
        bodyText:  bodyText || (attachments.length > 0 ? "" : " "),
        attachments:
          attachments.length > 0
            ? (attachments as unknown as Prisma.InputJsonValue)
            : undefined,
        status:    "SENT",
      },
      include: { author: { select: AUTHOR_SELECT } },
    });

    await tx.aihMsgConversation.update({
      where: { id: conversationId },
      data:  { lastMessageAt: row.createdAt },
    });

    await tx.aihMsgGovernanceEvent.create({
      data: {
        conversationId,
        messageId:   row.id,
        actorUserId,
        eventType:   "message.sent",
        contextJson: {
          bodyLength: row.bodyText.length,
          attachmentCount: attachments.length,
        },
      },
    });

    return row;
  });

  return toMessageDTO(message);
}

export async function sendMessageWithFile(
  actorUserId: string,
  conversationId: string,
  file: File,
  bodyText?: string,
): Promise<MsgMessageDTO> {
  const resolved = await resolveVaultAttachment(file);
  if (!resolved.ok) {
    throw validationError(resolved.error);
  }
  const filename = `${conversationId}-${Date.now()}`;
  const url = await uploadFile(file, "msg-vault", filename);
  const attachment: MsgAttachmentDTO = { ...resolved.attachment, url };
  return sendMessage(actorUserId, conversationId, {
    bodyText,
    attachments: [attachment],
  });
}

export async function removeMessage(actorUserId: string, messageId: string): Promise<void> {
  const message = await prisma.aihMsgMessage.findUnique({
    where: { id: messageId },
    select: { id: true, authorId: true, conversationId: true },
  });
  if (!message) {
    throw validationError("Message not found.");
  }
  if (message.authorId !== actorUserId) {
    throw accessDenied("You can only remove your own messages.");
  }

  await requireActiveParticipant(actorUserId, message.conversationId);

  await prisma.aihMsgMessage.update({
    where: { id: messageId },
    data:  { status: "REMOVED", deletedAt: new Date() },
  });
}

/** Internal: record a blocked send attempt. */
export async function recordBlockedMessageAttempt(
  actorUserId: string,
  conversationId: string,
  reason: string,
): Promise<void> {
  await prisma.aihMsgGovernanceEvent.create({
    data: {
      conversationId,
      actorUserId,
      eventType:   "message.blocked",
      contextJson: { reason },
    },
  });

  await createNotice({
    userId:         actorUserId,
    kind:           MsgNoticeKind.MESSAGE_BLOCKED,
    title:          "Message not sent",
    body:           reason,
    conversationId,
  });
}
