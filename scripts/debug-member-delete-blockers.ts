import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { prisma } from "@/lib/db/prisma";

const emails = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["ashlyn@test.com", "preston@test.com", "blk911@gmail.com"];

async function main() {
  for (const email of emails) {
    const u = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    if (!u) {
      console.log(`${email}: NOT FOUND`);
      continue;
    }
    const counts = {
      msgParticipants: await prisma.aihMsgParticipant.count({ where: { userId: u.id } }),
      msgMessages: await prisma.aihMsgMessage.count({ where: { authorId: u.id } }),
      msgConvsCreated: await prisma.aihMsgConversation.count({ where: { createdById: u.id } }),
      msgGovEvents: await prisma.aihMsgGovernanceEvent.count({ where: { actorUserId: u.id } }),
      posts: await prisma.post.count({ where: { profile: { userId: u.id } } }),
      trustUnitMembers: await prisma.trustUnitMember.count({ where: { userId: u.id } }),
      aihApprovals: await prisma.aihApprovalRequest.count({
        where: { OR: [{ requestorId: u.id }, { approverId: u.id }] },
      }),
      aihGuardian: await prisma.aihGuardianRelationship.count({
        where: { OR: [{ guardianUserId: u.id }, { childUserId: u.id }] },
      }),
      aihFamilyUnitsCreated: await prisma.aihFamilyUnit.count({
        where: { createdByUserId: u.id },
      }),
      aihFamilyMemberships: await prisma.aihFamilyUnitMember.count({ where: { userId: u.id } }),
      aihActivityPosts: await prisma.aihActivityPost.count({ where: { authorId: u.id } }),
      invitesSent: await prisma.invite.count({ where: { senderId: u.id } }),
      invitedUsers: await prisma.user.count({ where: { invitedById: u.id } }),
    };
    console.log(`\n${u.firstName} ${u.lastName} <${u.email}>`);
    console.log(JSON.stringify(counts, null, 2));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
