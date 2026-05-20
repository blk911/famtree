// app/(app)/dashboard/page.tsx
export const dynamic = "force-dynamic";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import {
  getPendingTrustRequestsSafe,
  serializeTrustGateRequests,
  getAcceptedBondPeersSafe,
} from "@/lib/trust";
import { loadTrustUnitsSafe } from "@/lib/tree/safe-data";
import { queryDashboardProfilePrompt, incrementDashboardProfilePromptSeen } from "@/lib/dashboard/safe-data";
import { DashboardMemberLayout } from "@/components/dashboard/DashboardMemberLayout";
import { ProfileCompletionPrompt } from "@/components/dashboard/ProfileCompletionPrompt";
import { MemberIntroVideoGate } from "@/components/dashboard/MemberIntroVideoGate";
import { IncomingIdentityAcks }    from "@/components/dashboard/IncomingIdentityAcks";
import type { FlatNode }           from "@/components/TreeList";
import { listSentInvitesForSender } from "@/lib/invite/sentForSender";
import { getVaultNotificationCount } from "@/lib/dashboard/vault-notification-count";
import { dashboardFeedWhere } from "@/lib/posts/dashboard-feed-where";
import {
  getFeedPosts,
  FEED_POST_INCLUDE,
  type FeedPost,
} from "@/lib/posts/queries";
// ── Tree helpers ───────────────────────────────────────────────────────────────
type Member = {
  id: string; firstName: string; lastName: string; email: string;
  photoUrl: string | null; role: string; status: string; createdAt: Date; invitedById: string | null;
  profile: { bio: string | null; familyRole: string | null; location: string | null } | null;
};
type TreeNode = { member: Member; children: TreeNode[] };

function buildTree(
  members: Member[],
  invites: { senderId: string; recipientEmail: string; createdAt: Date }[],
  rootUserId: string | undefined,
): TreeNode[] {
  const emailToMember = new Map(members.map(m => [m.email.toLowerCase(), m]));
  const memberById    = new Map(members.map(m => [m.id, m]));
  const parentOf      = new Map<string, string>();
  const invitedAtOf   = new Map<string, Date>();

  for (const m of members) {
    if (m.invitedById) parentOf.set(m.id, m.invitedById);
  }
  for (const inv of invites) {
    const child = emailToMember.get(inv.recipientEmail.toLowerCase());
    if (child && !parentOf.has(child.id)) {
      parentOf.set(child.id, inv.senderId);
      invitedAtOf.set(child.id, inv.createdAt);
    }
  }

  const childrenOf = new Map<string, Member[]>();
  for (const m of members) {
    const p = parentOf.get(m.id);
    if (p) { if (!childrenOf.has(p)) childrenOf.set(p, []); childrenOf.get(p)!.push(m); }
  }
  function buildNode(m: Member): TreeNode {
    return { member: m, children: (childrenOf.get(m.id) ?? [])
      .sort((a, b) => (invitedAtOf.get(a.id)?.getTime() ?? a.createdAt.getTime()) - (invitedAtOf.get(b.id)?.getTime() ?? b.createdAt.getTime()))
      .map(buildNode) };
  }
  if (rootUserId) { const root = memberById.get(rootUserId); if (root) return [buildNode(root)]; }
  return members.filter(m => !parentOf.has(m.id)).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).map(buildNode);
}

function flattenTree(roots: TreeNode[]): FlatNode[] {
  const result: FlatNode[] = [];
  function visit(node: TreeNode, depth: number, isLast: boolean) {
    result.push({ member: { ...node.member, createdAt: node.member.createdAt.toISOString() }, depth, isLast, prefixContinues: [] });
    node.children.forEach((c, i) => visit(c, depth + 1, i === node.children.length - 1));
  }
  roots.forEach((r, i) => visit(r, 0, i === roots.length - 1));
  return result;
}

function serializeDashboardPost(post: FeedPost) {
  return {
    ...post,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    profile: {
      ...post.profile,
      createdAt: post.profile.createdAt.toISOString(),
      updatedAt: post.profile.updatedAt.toISOString(),
      user: post.profile.user,
    },
  };
}
// ── Page ──────────────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role === "founder" || user.role === "admin") redirect("/admin");

  const lastSeen = user.lastLoginAt ?? new Date(Date.now() - 24 * 60 * 60 * 1000);

  const feedWhere = dashboardFeedWhere(user.id);

  const [
    totalMembers,
    myInvites,
    trustRequests,
    trustUnits,
    promptRows,
    members,
    treeInvites,
    newPosts,
    newComments,
    feedPostsRaw,
    myPostsRaw,
    bondPeers,
    composerSpacesRows,
    vaultNotificationCount,
  ] = await Promise.all([
    prisma.user.count(),
    listSentInvitesForSender(user.id, { take: 25 }),
    getPendingTrustRequestsSafe(user.id),
    loadTrustUnitsSafe(user.id),
    queryDashboardProfilePrompt(user.id),
    prisma.user.findMany({
      select: {
        id:true, firstName:true, lastName:true, email:true,
        photoUrl:true, role:true, status:true, createdAt:true, invitedById:true,
        profile: { select: { bio:true, familyRole:true, location:true } },
      },
      orderBy: { createdAt:"asc" },
    }),
    prisma.invite.findMany({
      where: { status: { in: ["ACCEPTED","PENDING"] } },
      select: { senderId:true, recipientEmail:true, createdAt:true },
    }),
    prisma.post.findMany({
      where: {
        AND: [
          { createdAt:{ gt: lastSeen } },
          { profile:{ userId:{ not: user.id } } },
          feedWhere,
        ],
      },
      select: { id:true, body:true, profile:{ select:{ userId:true } } },
      orderBy: { createdAt:"desc" },
      take: 10,
    }),
    prisma.comment.findMany({
      where: { createdAt:{ gt: lastSeen }, userId:{ not: user.id } },
      select: { id:true, postId:true },
      orderBy: { createdAt:"desc" },
      take: 10,
    }),
    getFeedPosts(user.id),
    prisma.post.findMany({
      where: { profile: { userId: user.id } },
      include: FEED_POST_INCLUDE,
      orderBy: { createdAt: "desc" },
    }),
    getAcceptedBondPeersSafe(user.id),
    prisma.dashboardSpaceMember.findMany({
      where: { userId: user.id },
      select: { space: { select: { id: true, kind: true, name: true } } },
    }),
    getVaultNotificationCount(user.id),
  ]);

  const serializedTrustRequests = serializeTrustGateRequests(trustRequests, user.id);

  const composerSpaces = composerSpacesRows.map((r) => r.space);

  const serializedFeedPosts = feedPostsRaw.map(serializeDashboardPost);
  const serializedMyPosts = myPostsRaw.map(serializeDashboardPost);

  const membersForPrivate = members.map((m) => ({
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    photoUrl: m.photoUrl,
  }));

  const missingProfilePhoto = !user.photoUrl;
  const promptState         = promptRows[0];
  const showProfilePrompt   = missingProfilePhoto
    && !promptState?.dashboardProfilePromptDismissedAt
    && (promptState?.dashboardProfilePromptSeenCount ?? 0) < 3;

  if (showProfilePrompt) {
    await incrementDashboardProfilePromptSeen(user.id);
  }

  const roots = buildTree(members, treeInvites, user.id);
  const flat  = flattenTree(roots);

  // Serialize for client components
  const serializedInvites = myInvites.map(inv => ({
    id:             inv.id,
    recipientEmail: inv.recipientEmail,
    status:         inv.status,
    createdAt:      inv.createdAt.toISOString(),
  }));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>

      <MemberIntroVideoGate />
      {showProfilePrompt && <ProfileCompletionPrompt />}
      <IncomingIdentityAcks />

      {/* ── Two-column: tabbed content hub + context rail ── */}
      <DashboardMemberLayout
        currentUserId={user.id}
        currentUserRole={user.role}
        initialRequests={serializedTrustRequests}
        lastSeenAt={user.lastLoginAt?.toISOString() ?? null}
        dmUnreadByPeerId={{}}
        flat={flat}
        totalMembers={totalMembers}
        trustUnits={trustUnits as any[]}
        newPostsCount={newPosts.length}
        newCommentsCount={newComments.length}
        invites={serializedInvites}
        composerSpaces={composerSpaces}
        serializedFeedPosts={serializedFeedPosts}
        serializedPrivatePosts={[]}
        serializedMyPosts={serializedMyPosts}
        membersForPrivate={membersForPrivate}
        bondPeers={bondPeers}
        vaultNotificationCount={vaultNotificationCount}
      />
    </div>
  );
}
