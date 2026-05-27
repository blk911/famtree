/**
 * Dev/admin one-off: permanently delete a user by email (bypasses founder UI guard).
 * Usage: npx tsx scripts/admin-delete-user-by-email.ts founder-parent@famtree.test
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { prisma } from "@/lib/db/prisma";
import { deleteMemberAccount } from "@/lib/admin/delete-member-account";

const email = process.argv[2];
if (!email) {
  console.error("Usage: npx tsx scripts/admin-delete-user-by-email.ts <email>");
  process.exit(1);
}

async function main() {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, firstName: true, lastName: true, email: true, role: true },
  });
  if (!user) {
    console.log(`Not found: ${email}`);
    return;
  }

  await prisma.trustUnitMember.deleteMany({ where: { userId: user.id } });
  await prisma.trustUnitRequestMember.deleteMany({ where: { userId: user.id } });
  await prisma.trustUnitApproval.deleteMany({ where: { userId: user.id } });
  await prisma.trustUnitRequest.deleteMany({ where: { createdById: user.id } });
  await prisma.user.updateMany({ where: { invitedById: user.id }, data: { invitedById: null } });

  await prisma.$transaction(async (tx) => {
    await deleteMemberAccount(user.id, tx);
  });

  console.log(`Deleted ${user.firstName} ${user.lastName} <${user.email}> (${user.role})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
