import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { PrismaClient } from "@prisma/client";
import { maskInviteEmail } from "../lib/trust/tuProposal";

const prisma = new PrismaClient();
const WATCH = (process.argv.slice(2).length ? process.argv.slice(2) : [
  "oreo12798@gmail.com",
  "taylormanaya@gmail.com",
]).map((e) => e.toLowerCase());

async function main() {
  for (const email of WATCH) {
    const rows = await prisma.invite.findMany({
      where: { recipientEmail: { equals: email, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      include: { trustUnitPendingSlots: { select: { requestId: true } } },
    });
    console.log(`\n${email}: ${rows.length} row(s)`);
    for (const i of rows) {
      console.log(
        `  ${i.createdAt.toISOString()} ${i.status} intent=${i.inviteIntent ?? "—"} tuSlots=${i.trustUnitPendingSlots.length} mask=${maskInviteEmail(i.recipientEmail)}`,
      );
    }
  }
  const pendingTu = await prisma.trustUnitRequest.count({ where: { status: "PENDING" } });
  const slots = await prisma.trustUnitRequestPendingInvite.count();
  console.log(`\nPending TU: ${pendingTu} | pending invite slots: ${slots}`);
}

main().finally(() => prisma.$disconnect());
