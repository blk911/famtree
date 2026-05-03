import { prisma } from "@/lib/db/prisma";

const ADMIN_MEMBER_BASE_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  status: true,
  relationship: true,
  invitedById: true,
  createdAt: true,
} as const;

/** Admin member list: tolerate DBs without selfServiceIdentityChangesRemaining */
export async function loadRecentMembersForAdmin() {
  try {
    return await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        ...ADMIN_MEMBER_BASE_SELECT,
        selfServiceIdentityChangesRemaining: true,
      },
    });
  } catch (err) {
    console.error("[admin] recentMembers query failed; retrying without identity slot column", err);
    const rows = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: ADMIN_MEMBER_BASE_SELECT,
    });
    return rows.map((r) => ({ ...r, selfServiceIdentityChangesRemaining: 1 }));
  }
}

export async function loadWaitlistSafe() {
  try {
    return await prisma.waitlist.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    });
  } catch (err) {
    console.error("[admin] waitlist query failed", err);
    return [];
  }
}
