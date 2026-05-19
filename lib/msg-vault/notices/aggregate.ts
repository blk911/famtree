// Merge persisted AihMsgNotice rows with derived governance notices (Agent 53).

import { prisma } from "@/lib/db/prisma";
import type { MsgNoticeStatus } from "@/types/msg-vault";
import { MsgNoticeStatus as Status } from "@/types/msg-vault";
import {
  buildApprovalNotices,
  buildAuditNotices,
  buildInviteNotices,
  collectUserIdsForNames,
  extractReadRefs,
  loadDerivedSourceData,
  loadNameMap,
  persistedToVault,
} from "./derived";
import { countUnread, filterByStatus, sortVaultNotices } from "./sort";
import type { VaultNoticeDTO, VaultNoticesResult } from "./types";

export async function aggregateNoticesForUser(
  userId: string,
  statusFilter?: MsgNoticeStatus,
): Promise<VaultNoticesResult> {
  const persistedRows = await prisma.aihMsgNotice.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const readRefs = extractReadRefs(persistedRows);
  const skipApprovalIds = new Set(
    persistedRows
      .map((r) => r.approvalRequestId)
      .filter((id): id is string => !!id),
  );

  const { asApprover, asRequestor, sentInvites, auditEvents } =
    await loadDerivedSourceData(userId);

  const allApprovals = [...asApprover, ...asRequestor];
  const nameMap = await loadNameMap(
    collectUserIdsForNames(allApprovals, auditEvents),
  );

  const derived: VaultNoticeDTO[] = [
    ...buildApprovalNotices(
      userId,
      asApprover,
      asRequestor,
      nameMap,
      readRefs,
      skipApprovalIds,
    ),
    ...buildInviteNotices(userId, sentInvites, readRefs),
    ...buildAuditNotices(userId, auditEvents, nameMap, readRefs),
  ];

  const persisted = persistedRows.map(persistedToVault);

  const merged = mergeNotices(persisted, derived);
  const sorted = sortVaultNotices(merged);
  const filtered = filterByStatus(sorted, statusFilter);

  return {
    items: filtered,
    unreadCount: countUnread(sorted),
  };
}

function mergeNotices(
  persisted: VaultNoticeDTO[],
  derived: VaultNoticeDTO[],
): VaultNoticeDTO[] {
  const byId = new Map<string, VaultNoticeDTO>();

  for (const p of persisted) {
    byId.set(p.id, p);
  }

  const persistedValues = Array.from(byId.values());
  for (const d of derived) {
    if (byId.has(d.id)) continue;
    if (
      d.approvalRequestId &&
      persistedValues.some((x) => x.approvalRequestId === d.approvalRequestId)
    ) {
      continue;
    }
    byId.set(d.id, d);
  }

  return Array.from(byId.values());
}
