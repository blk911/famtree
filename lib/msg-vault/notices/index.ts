// Msg Vault — notice services (Agent 50 + aggregated notices Agent 53).

import { prisma } from "@/lib/db/prisma";
import { notFound, accessDenied } from "@/lib/msg-vault/errors";
import { toNoticeDTO } from "@/lib/msg-vault/mappers";
import type { CreateNoticeInput, MsgNoticeDTO, MsgNoticeStatus } from "@/types/msg-vault";
import { aggregateNoticesForUser } from "./aggregate";
import { markDerivedNoticeRead } from "./mark-derived";
import { parseDerivedNoticeId } from "./refs";
import type { VaultNoticesResult } from "./types";

export type { VaultNoticeDTO, VaultNoticesResult } from "./types";

export async function listNoticesForUser(
  userId: string,
  statusFilter?: MsgNoticeStatus,
): Promise<VaultNoticesResult> {
  return aggregateNoticesForUser(userId, statusFilter);
}

export async function markNoticeRead(
  userId: string,
  noticeId: string,
): Promise<MsgNoticeDTO> {
  if (parseDerivedNoticeId(noticeId)) {
    return markDerivedNoticeRead(userId, noticeId);
  }

  const row = await prisma.aihMsgNotice.findUnique({ where: { id: noticeId } });
  if (!row) {
    throw notFound("Notice not found.");
  }
  if (row.userId !== userId) {
    throw accessDenied("You cannot update another member's notice.");
  }

  const updated =
    row.status === "UNREAD"
      ? await prisma.aihMsgNotice.update({
          where: { id: noticeId },
          data:  { status: "READ", readAt: new Date() },
        })
      : row;

  return toNoticeDTO(updated);
}

/** Service-only — not exposed via public create route. */
export async function createNotice(input: CreateNoticeInput): Promise<MsgNoticeDTO> {
  const row = await prisma.aihMsgNotice.create({
    data: {
      userId:            input.userId,
      kind:              input.kind,
      title:             input.title,
      body:              input.body,
      conversationId:    input.conversationId ?? null,
      trustUnitId:       input.trustUnitId ?? null,
      approvalRequestId: input.approvalRequestId ?? null,
      status:            "UNREAD",
    },
  });
  return toNoticeDTO(row);
}
