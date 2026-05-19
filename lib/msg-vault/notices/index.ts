// Msg Vault — notice services (Agent 50).

import { prisma } from "@/lib/db/prisma";
import { notFound, accessDenied } from "@/lib/msg-vault/errors";
import { toNoticeDTO } from "@/lib/msg-vault/mappers";
import type { CreateNoticeInput, MsgNoticeDTO, MsgNoticeStatus } from "@/types/msg-vault";

export async function listNoticesForUser(
  userId: string,
  statusFilter?: MsgNoticeStatus,
): Promise<MsgNoticeDTO[]> {
  const rows = await prisma.aihMsgNotice.findMany({
    where: {
      userId,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    orderBy: [
      { status: "asc" },
      { createdAt: "desc" },
    ],
  });

  // UNREAD sorts before READ/ARCHIVED with status asc — refine: unread first
  const unread = rows.filter((r) => r.status === "UNREAD");
  const rest = rows.filter((r) => r.status !== "UNREAD");
  return [...unread, ...rest].map(toNoticeDTO);
}

export async function markNoticeRead(
  userId: string,
  noticeId: string,
): Promise<MsgNoticeDTO> {
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
