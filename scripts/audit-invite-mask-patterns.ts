/** List all invites + pending TU slots with mask patterns. */
import { PrismaClient } from "@prisma/client";
import { maskInviteEmail } from "../lib/trust/tuProposal";

const prisma = new PrismaClient();

async function main() {
  const invites = await prisma.invite.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      recipientEmail: true,
      status: true,
      createdAt: true,
      sender: { select: { firstName: true, email: true } },
      trustUnitPendingSlots: { select: { requestId: true } },
    },
  });

  console.log(`Total invites: ${invites.length}\n`);
  for (const i of invites) {
    const m = maskInviteEmail(i.recipientEmail);
    if (m.includes("***") || i.trustUnitPendingSlots.length > 0) {
      console.log(
        `${i.createdAt.toISOString()} ${m} raw=${i.recipientEmail} ${i.status} tu=${i.trustUnitPendingSlots.length} sender=${i.sender.firstName}`,
      );
    }
  }

  const pending = await prisma.trustUnitRequest.findMany({
    where: { status: "PENDING" },
    include: {
      pendingInviteSlots: { include: { invite: { select: { recipientEmail: true } } } },
      createdBy: { select: { firstName: true, email: true } },
    },
  });
  console.log(`\nPending TU requests: ${pending.length}`);
  for (const r of pending) {
    console.log(`  ${r.id} by ${r.createdBy.firstName} slots=${r.pendingInviteSlots.length}`);
    for (const s of r.pendingInviteSlots) {
      console.log(`    ${maskInviteEmail(s.invite.recipientEmail)} ${s.invite.recipientEmail}`);
    }
  }
}

main().finally(() => prisma.$disconnect());
