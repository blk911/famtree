// Persist read state for derived notices via shadow AihMsgNotice rows (Agent 53).

import { prisma } from "@/lib/db/prisma";
import { notFound } from "@/lib/msg-vault/errors";
import { toNoticeDTO } from "@/lib/msg-vault/mappers";
import type { MsgNoticeDTO } from "@/types/msg-vault";
import { aggregateNoticesForUser } from "./aggregate";
import { parseDerivedNoticeId, refKeyForDerived, stripVaultRef, vaultRef } from "./refs";

export async function markDerivedNoticeRead(
  userId: string,
  derivedId: string,
): Promise<MsgNoticeDTO> {
  const parsed = parseDerivedNoticeId(derivedId);
  if (!parsed) {
    throw notFound("Notice not found.");
  }

  const { items } = await aggregateNoticesForUser(userId);
  const current = items.find((n) => n.id === derivedId);
  if (!current) {
    throw notFound("Notice not found.");
  }

  const refKey = refKeyForDerived(parsed);
  const marker = vaultRef(refKey);
  const bodyWithRef = `${marker}\n${stripVaultRef(current.body)}`;

  const shadow = await prisma.aihMsgNotice.findFirst({
    where: { userId, body: { contains: marker } },
  });

  if (shadow) {
    const updated =
      shadow.status === "UNREAD"
        ? await prisma.aihMsgNotice.update({
            where: { id: shadow.id },
            data:  { status: "READ", readAt: new Date() },
          })
        : shadow;
    return { ...toNoticeDTO(updated), id: derivedId };
  }

  const row = await prisma.aihMsgNotice.create({
    data: {
      userId,
      kind:              current.kind,
      title:             current.title,
      body:              bodyWithRef,
      status:            "READ",
      readAt:            new Date(),
      conversationId:    current.conversationId,
      trustUnitId:       current.trustUnitId,
      approvalRequestId: current.approvalRequestId,
    },
  });

  return { ...toNoticeDTO(row), id: derivedId };
}
