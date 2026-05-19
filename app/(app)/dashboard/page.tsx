// app/(app)/dashboard/page.tsx
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getPendingTrustRequestsSafe,
  serializeTrustGateRequests,
  getAcceptedBondPeersSafe,
} from "@/lib/trust";
import { loadTrustUnitsSafe } from "@/lib/tree/safe-data";
import { queryDashboardProfilePrompt, incrementDashboardProfilePromptSeen } from "@/lib/dashboard/safe-data";
import { DashboardHubColumns } from "@/components/dashboard/DashboardHubColumns";
import { ProfileCompletionPrompt } from "@/components/dashboard/ProfileCompletionPrompt";
import { IncomingIdentityAcks }    from "@/components/dashboard/IncomingIdentityAcks";
import type { FlatNode }           from "@/components/TreeList";
import { listSentInvitesForSender } from "@/lib/invite/sentForSender";
import { getVaultNotificationCount } from "@/lib/dashboard/vault-notification-count";
import { dashboardFeedWhere } from "@/lib/posts/dashboard-feed-where";
import {
  getFeedPosts,
  getPrivateFeedPosts,
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
function dmUnreadByPeerFromPrivatePosts(
  posts: Array<{
    createdAt: string;
    visibility?: Array<{ userId: string }>;
    profile: { user: { id: string } };
  }>,
  currentUserId: string,
  lastSeen: Date | null,
): Record<string, number> {
  const out: Record<string, number> = {};
  if (!lastSeen || Number.isNaN(lastSeen.getTime())) return out;

  for (const post of posts) {
    const authorId = post.profile.user.id;
    if (authorId === currentUserId) continue;

    const vis = post.visibility?.map((v) => v.userId) ?? [];
    const ids = new Set<string>([authorId, ...vis]);
    if (ids.size !== 2 || !ids.has(currentUserId)) continue;

    const peerId = Array.from(ids).find((id) => id !== currentUserId);
    if (!peerId) continue;

    if (new Date(post.createdAt) <= lastSeen) continue;

    out[peerId] = (out[peerId] ?? 0) + 1;
  }

  return out;
}

// ── Shared card style ──────────────────────────────────────────────────────────
const card = {
  background:"white", borderRadius:"16px",
  border:"1px solid #ece9e3", overflow:"hidden",
  boxShadow:"0 1px 4px rgba(0,0,0,0.05)",
};

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
    privatePostsRaw,
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
    getPrivateFeedPosts(user.id),
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

  const joinedViaYou   = myInvites.filter(i => i.status === "REGISTERED").length;
  const serializedTrustRequests = serializeTrustGateRequests(trustRequests);

  const composerSpaces = composerSpacesRows.map((r) => r.space);

  const serializedFeedPosts = feedPostsRaw.map(serializeDashboardPost);
  const serializedPrivatePosts = privatePostsRaw.map(serializeDashboardPost);
  const serializedMyPosts = myPostsRaw.map(serializeDashboardPost);

  const dmUnreadByPeerId = dmUnreadByPeerFromPrivatePosts(
    serializedPrivatePosts,
    user.id,
    user.lastLoginAt ?? null,
  );

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

      {showProfilePrompt && <ProfileCompletionPrompt />}
      <IncomingIdentityAcks />

      {/* ── 4-col metric + action strip ── */}
      <div className="grid grid-cols-4 max-[680px]:grid-cols-2 gap-[10px]">
        {/* Stat tiles */}
        {([
          { label:"My Family",      value:totalMembers,     color:"#6366f1", href:"/tree"   },
          { label:"INVITES SENT",   value:myInvites.length, color:"#f59e0b", href:"/invite" },
          { label:"JOINED VIA YOU", value:joinedViaYou,     color:"#10b981", href:"/invite" },
        ] as const).map(({ label, value, color, href }) => (
          <Link key={label} href={href} style={{
            ...card, padding:"12px 16px", borderLeft:`3px solid ${color}`,
            textDecoration:"none", display:"flex", alignItems:"center",
            justifyContent:"space-between", gap:"10px",
          }}>
            <span style={{ fontSize:"11px", fontWeight:700, color:"#78716c", letterSpacing:"0.06em", textTransform:"uppercase" }}>
              {label}
            </span>
            <span style={{ fontSize:"20px", fontWeight:800, color:"#1c1917", lineHeight:1 }}>
              {value}
            </span>
          </Link>
        ))}

        {/* Invite — same card chrome as other metrics (links to /invite) */}
        <Link
          href="/invite"
          style={{
            ...card,
            padding: "12px 16px",
            borderLeft: "3px solid #6366f1",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#78716c",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            INVITE
          </span>
          <span style={{ fontSize: "20px", fontWeight: 800, color: "#1c1917", lineHeight: 1 }} aria-hidden>
            ✉️
          </span>
        </Link>
      </div>

      {/* ── Two-column: tabbed content hub + context rail ── */}
      <DashboardHubColumns
        currentUserId={user.id}
        initialRequests={serializedTrustRequests}
        lastSeenAt={user.lastLoginAt?.toISOString() ?? null}
        dmUnreadByPeerId={dmUnreadByPeerId}
        flat={flat}
        totalMembers={totalMembers}
        trustUnits={trustUnits as any[]}
        newPostsCount={newPosts.length}
        newCommentsCount={newComments.length}
        invites={serializedInvites}
        composerSpaces={composerSpaces}
        serializedFeedPosts={serializedFeedPosts}
        serializedPrivatePosts={serializedPrivatePosts}
        serializedMyPosts={serializedMyPosts}
        membersForPrivate={membersForPrivate}
        bondPeers={bondPeers}
        vaultNotificationCount={vaultNotificationCount}
      />
    </div>
  );
}
