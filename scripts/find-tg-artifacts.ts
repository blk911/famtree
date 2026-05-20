import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { PrismaClient } from "@prisma/client";
import { maskInviteEmail } from "../lib/trust/tuProposal";

const prisma = new PrismaClient();

function dbHostLabel(): string {
  const url = process.env.DATABASE_URL ?? "";
  try {
    return new URL(url.replace(/^postgres(ql)?:\/\//, "https://")).hostname;
  } catch {
    return "(unparsed)";
  }
}

async function main() {
  console.log(`DATABASE host: ${dbHostLabel()}\n`);

  const invites = await prisma.invite.findMany({
    include: {
      trustUnitPendingSlots: true,
      sender: { select: { email: true, firstName: true } },
    },
  });

  const maskHits = invites.filter((i) => maskInviteEmail(i.recipientEmail) === "t***@g***");
  console.log("Invites matching mask t***@g***:", maskHits.length);
  for (const i of maskHits) {
    console.log(" ", i.id, i.recipientEmail, i.status, "slots", i.trustUnitPendingSlots.length);
  }

  const users = await prisma.user.findMany({
    where: {
      email: { startsWith: "t", mode: "insensitive" },
    },
    select: { id: true, email: true, firstName: true },
  });
  const gUsers = users.filter((u) => {
    const d = u.email.split("@")[1]?.toLowerCase() ?? "";
    return d.startsWith("g");
  });
  console.log("\nUsers t*@g*:", gUsers.length);
  for (const u of gUsers) console.log(" ", u.email, u.firstName);

  const pending = await prisma.trustUnitRequest.findMany({
    where: { status: "PENDING" },
    include: {
      pendingInviteSlots: { include: { invite: true } },
      members: { include: { user: { select: { email: true } } } },
      createdBy: { select: { email: true, firstName: true } },
    },
  });
  console.log("\nPending TU:", pending.length);
  for (const r of pending) {
    for (const s of r.pendingInviteSlots) {
      const m = maskInviteEmail(s.invite.recipientEmail);
      console.log(`  req ${r.id} slot ${m} ${s.invite.recipientEmail}`);
    }
  }

  const allSlots = await prisma.trustUnitRequestPendingInvite.count();
  console.log("\nTotal trustUnitRequestPendingInvite rows:", allSlots);
}

main().finally(() => prisma.$disconnect());
