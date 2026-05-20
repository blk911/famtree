/**
 * Dev-only: identify (and optionally archive) stale Msg Vault conversations.
 *
 *   npx tsx scripts/msg-vault/cleanup-stale-conversations.ts           # dry-run (default)
 *   npx tsx scripts/msg-vault/cleanup-stale-conversations.ts --apply   # archive stale rows
 *
 * Never deletes messages. --apply sets conversation status to ARCHIVED only.
 */

import { PrismaClient } from "@prisma/client";
import {
  classifyStaleConversation,
  trustUnitMapFromRows,
  type StaleConversationReason,
} from "../../lib/msg-vault/conversation-display-guard";
import { toConversationDTO } from "../../lib/msg-vault/mappers";
import type { MsgConversationDTO } from "../../types/msg-vault";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

async function main() {
  const rows = await prisma.aihMsgConversation.findMany({
    where: { status: "ACTIVE" },
    include: {
      participants: {
        where: { status: "ACTIVE" },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, photoUrl: true },
          },
        },
      },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const tuIds = Array.from(
    new Set(rows.map((r) => r.trustUnitId).filter((id): id is string => !!id)),
  );
  const trustUnits = tuIds.length
    ? await prisma.trustUnit.findMany({
        where: { id: { in: tuIds } },
        include: { members: true },
      })
    : [];

  const tuRows = trustUnits.map((tu) => ({
    id: tu.id,
    members: tu.members.map((m) => ({ userId: m.userId })),
  }));
  const tuMap = trustUnitMapFromRows(tuRows);

  const stale: Array<{
    id: string;
    kind: string;
    reason: StaleConversationReason;
    messageCount: number;
    viewerUserId: string;
  }> = [];

  for (const row of rows) {
    const dto: MsgConversationDTO = toConversationDTO(row, row.participants);
    const ownerId = row.createdById;
    const reason = classifyStaleConversation(dto, ownerId, tuMap);
    if (!reason && row._count.messages === 0 && !row.lastMessageAt) {
      stale.push({
        id: row.id,
        kind: row.kind,
        reason: "no_messages",
        messageCount: 0,
        viewerUserId: ownerId,
      });
      continue;
    }
    if (reason) {
      stale.push({
        id: row.id,
        kind: row.kind,
        reason,
        messageCount: row._count.messages,
        viewerUserId: ownerId,
      });
    }
  }

  const byReason = stale.reduce<Record<string, number>>((acc, s) => {
    acc[s.reason] = (acc[s.reason] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`[cleanup-stale-conversations] mode=${apply ? "APPLY" : "DRY-RUN"}`);
  console.log(`[cleanup-stale-conversations] active conversations scanned: ${rows.length}`);
  console.log(`[cleanup-stale-conversations] stale candidates: ${stale.length}`);
  console.log("[cleanup-stale-conversations] by reason:", byReason);

  for (const s of stale.slice(0, 50)) {
    console.log(
      `  - ${s.id} kind=${s.kind} reason=${s.reason} messages=${s.messageCount}`,
    );
  }
  if (stale.length > 50) {
    console.log(`  … and ${stale.length - 50} more`);
  }

  if (!apply) {
    console.log("\nDry-run only. Re-run with --apply to ARCHIVE stale conversations (messages preserved).");
    return;
  }

  let archived = 0;
  for (const s of stale) {
    if (s.messageCount > 0) {
      console.log(
        `  skip archive ${s.id}: has ${s.messageCount} message(s) — archive manually if intended`,
      );
      continue;
    }
    await prisma.aihMsgConversation.update({
      where: { id: s.id },
      data: { status: "ARCHIVED" },
    });
    archived++;
  }
  console.log(`[cleanup-stale-conversations] archived ${archived} empty stale conversation(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
