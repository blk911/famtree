/**
 * Audit + repair Trust Unit proposals and pending invite slots.
 * Run: npx tsx scripts/debug-trust-unit-pending-invites.ts
 * Apply: npx tsx scripts/debug-trust-unit-pending-invites.ts --apply
 */

import { PrismaClient } from "@prisma/client";
import { maskInviteEmail } from "../lib/trust/tuProposal";
import { repairStalePendingTrustProposals } from "../lib/trust/repairPendingProposals";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

async function audit() {
  const pending = await prisma.trustUnitRequest.findMany({
    where: { status: "PENDING" },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true, email: true, photoUrl: true } },
      members: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
      pendingInviteSlots: true,
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`\n=== PENDING Trust Unit Requests: ${pending.length} ===\n`);

  for (const req of pending) {
    console.log(`Request ${req.id} (${req.createdAt.toISOString()})`);
    console.log(`  creator: ${req.createdBy.firstName} ${req.createdBy.lastName} <${req.createdBy.email}> photo=${req.createdBy.photoUrl ? "yes" : "NO"}`);
    for (const m of req.members) {
      console.log(`  member: ${m.user.firstName} ${m.user.lastName} <${m.user.email}>`);
    }
    for (const slot of req.pendingInviteSlots) {
      const inv = await prisma.invite.findUnique({
        where: { id: slot.inviteId },
        include: { sender: { select: { firstName: true, lastName: true, email: true } } },
      });
      if (!inv) {
        console.log(`  slot ${slot.id}: ORPHAN inviteId=${slot.inviteId}`);
      } else {
        console.log(
          `  slot: ${maskInviteEmail(inv.recipientEmail)} raw=${inv.recipientEmail} status=${inv.status} sender=${inv.sender.firstName} <${inv.sender.email}>`,
        );
      }
    }
    console.log("");
  }

  const recentInvites = await prisma.invite.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      recipientEmail: true,
      status: true,
      createdAt: true,
      sender: { select: { firstName: true, lastName: true, email: true } },
      trustUnitPendingSlots: { select: { requestId: true } },
    },
  });
  console.log("=== Last 30 invites (site-wide) ===\n");
  for (const inv of recentInvites) {
    console.log(
      `${inv.createdAt.toISOString()} ${inv.status} ${inv.recipientEmail} → sender ${inv.sender.firstName} ${inv.sender.email} tuSlots=${inv.trustUnitPendingSlots.length}`,
    );
  }
}

async function main() {
  await audit();

  if (apply) {
    console.log("\n=== Applying repairStalePendingTrustProposals ===\n");
    const result = await repairStalePendingTrustProposals({ dryRun: false });
    console.log(JSON.stringify(result, null, 2));
    await audit();
  } else {
    const dry = await repairStalePendingTrustProposals({ dryRun: true });
    console.log(`\n=== Dry-run repair issues: ${dry.issues.length} ===`);
    for (const i of dry.issues) {
      console.log(`  [${i.kind}] ${i.requestId} ${i.inviteId ?? ""} — ${i.detail}`);
    }
    console.log("\nRe-run with --apply to repair.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
