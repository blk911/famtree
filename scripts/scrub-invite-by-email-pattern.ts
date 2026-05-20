/**
 * Find and delete invite + Trust Unit artifacts for emails matching t***@g*** mask pattern.
 * Dry-run: npx tsx scripts/scrub-invite-by-email-pattern.ts
 * Apply:   npx tsx scripts/scrub-invite-by-email-pattern.ts --apply
 *
 * Optional exact match: --email=test@example.com
 */

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { PrismaClient, TrustApprovalStatus, TrustUnitRequestStatus } from "@prisma/client";
import { maskInviteEmail } from "../lib/trust/tuProposal";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");
const emailArg = process.argv.find((a) => a.startsWith("--email="))?.split("=")[1]?.trim().toLowerCase();

function matchesMaskPattern(email: string): boolean {
  if (emailArg) return email.trim().toLowerCase() === emailArg;
  return maskInviteEmail(email) === "t***@g***";
}

async function findTargets() {
  const invites = await prisma.invite.findMany({
    select: {
      id: true,
      recipientEmail: true,
      status: true,
      senderId: true,
      createdAt: true,
      trustUnitPendingSlots: { select: { id: true, requestId: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return invites.filter((i) => matchesMaskPattern(i.recipientEmail));
}

async function scrubTrustRequest(requestId: string, inviteId: string) {
  const req = await prisma.trustUnitRequest.findUnique({
    where: { id: requestId },
    include: { members: true, pendingInviteSlots: true, approvals: true },
  });
  if (!req) return;

  const remainingSlots = req.pendingInviteSlots.filter((s) => s.inviteId !== inviteId);
  const memberCount = req.members.length + remainingSlots.length;
  const action = memberCount < 3 ? "DECLINE_REQUEST" : "REMOVE_SLOT_ONLY";

  if (apply) {
    await prisma.trustUnitRequestPendingInvite.deleteMany({ where: { inviteId } });
    if (action === "DECLINE_REQUEST") {
      await prisma.$transaction([
        prisma.trustUnitApproval.updateMany({
          where: { requestId },
          data: { status: TrustApprovalStatus.DECLINED },
        }),
        prisma.trustUnitRequest.update({
          where: { id: requestId },
          data: { status: TrustUnitRequestStatus.DECLINED },
        }),
      ]);
    }
  }
  console.log(
    `  TU request ${requestId} status=${req.status} members=${req.members.length} slots=${req.pendingInviteSlots.length} → ${apply ? action : `would ${action}`}`,
  );
}

async function scrubInvite(inviteId: string) {
  const slots = await prisma.trustUnitRequestPendingInvite.findMany({ where: { inviteId } });
  const requestIds = Array.from(new Set(slots.map((s) => s.requestId)));

  for (const requestId of requestIds) {
    await scrubTrustRequest(requestId, inviteId);
  }

  if (apply) {
    await prisma.invite.delete({ where: { id: inviteId } }).catch((e) => {
      console.warn(`  invite delete ${inviteId}:`, (e as Error).message);
    });
  }
}

/** Orphan slots where invite row is already gone */
async function scrubOrphanSlotsForPattern() {
  const slots = await prisma.trustUnitRequestPendingInvite.findMany({
    include: { invite: { select: { id: true, recipientEmail: true } } },
  });
  for (const slot of slots) {
    const email = slot.invite?.recipientEmail;
    if (!email && apply) {
      await prisma.trustUnitRequestPendingInvite.delete({ where: { id: slot.id } });
      console.log(`  deleted orphan slot ${slot.id} (no invite)`);
      continue;
    }
    if (email && matchesMaskPattern(email)) {
      console.log(`  slot ${slot.id} on request ${slot.requestId}`);
      if (slot.invite) await scrubInvite(slot.invite.id);
    }
  }
}

function dbHostLabel(): string {
  const url = process.env.DATABASE_URL ?? "";
  try {
    const normalized = url.replace(/^postgres(ql)?:\/\//, "https://");
    return new URL(normalized).hostname;
  } catch {
    return "(could not parse DATABASE_URL)";
  }
}

async function main() {
  console.log(`DATABASE host: ${dbHostLabel()}\n`);

  const targets = await findTargets();
  console.log(`\n=== Matches (${targets.length}) ${emailArg ? `email=${emailArg}` : "mask t***@g***"} ===\n`);
  if (targets.length === 0) {
    console.log("No invites found.");
    return;
  }

  for (const inv of targets) {
    console.log(
      `${inv.createdAt.toISOString()} invite ${inv.id} ${inv.recipientEmail} (${inv.status}) slots=${inv.trustUnitPendingSlots.length}`,
    );
    await scrubInvite(inv.id);
  }

  console.log("\n--- Orphan / slotted rows ---");
  await scrubOrphanSlotsForPattern();

  if (!apply) {
    console.log("\nDry-run only. Re-run with --apply to delete.");
    return;
  }

  console.log("\n=== Post-scrub audit ===\n");
  const left = await findTargets();
  console.log(`Remaining matches: ${left.length}`);

  const pending = await prisma.trustUnitRequest.findMany({
    where: { status: "PENDING" },
    include: { pendingInviteSlots: { include: { invite: { select: { recipientEmail: true } } } } },
  });
  const ghostSlots = pending.flatMap((r) =>
    r.pendingInviteSlots.filter((s) => matchesMaskPattern(s.invite.recipientEmail)),
  );
  console.log(`Pending TU slots still matching: ${ghostSlots.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
