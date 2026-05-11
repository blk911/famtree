// app/(app)/dashboard/page.tsx
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getPendingTrustRequestsSafe,
  serializeTrustGateRequests,
} from "@/lib/trust";
import { loadTreeViewPrefsSafe, loadTrustUnitsSafe } from "@/lib/tree/safe-data";
import { queryDashboardProfilePrompt, incrementDashboardProfilePromptSeen } from "@/lib/dashboard/safe-data";
import { DashboardTrustUnitGate }  from "@/components/dashboard/DashboardTrustUnitGate";
import { DashboardVaultTabs }      from "@/components/dashboard/DashboardVaultTabs";
import { DashboardContextRail }    from "@/components/dashboard/DashboardContextRail";
import { ProfileCompletionPrompt } from "@/components/dashboard/ProfileCompletionPrompt";
import { IncomingIdentityAcks }    from "@/components/dashboard/IncomingIdentityAcks";
import { TreeList, type FlatNode } from "@/components/TreeList";
import { listSentInvitesForSender } from "@/lib/invite/sentForSender";

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

  const [
    totalMembers,
    myInvites,
    trustRequests,
    trustUnits,
    promptRows,
    members,
    invites,
    newPosts,
    newComments,
    treeViewPrefs,
  ] = await Promise.all([
    prisma.user.count(),
    listSentInvitesForSender(user.id, { take: 6 }),
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
      where: { createdAt:{ gt: lastSeen }, profile:{ userId:{ not: user.id } } },
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
    loadTreeViewPrefsSafe(user.id),
  ]);

  const joinedViaYou    = myInvites.filter(i => i.status === "REGISTERED").length;
  const vaultNewCount   = newPosts.length + newComments.length;
  const serializedTrustRequests = serializeTrustGateRequests(trustRequests);

  const missingProfilePhoto = !user.photoUrl;
  const promptState         = promptRows[0];
  const showProfilePrompt   = missingProfilePhoto
    && !promptState?.dashboardProfilePromptDismissedAt
    && (promptState?.dashboardProfilePromptSeenCount ?? 0) < 3;

  if (showProfilePrompt) {
    await incrementDashboardProfilePromptSeen(user.id);
  }

  const roots = buildTree(members, invites, user.id);
  const flat  = flattenTree(roots);
  const treePrefsInitial = Object.fromEntries(
    treeViewPrefs.map(p => [p.targetId, { muted: p.muted, hidden: p.hidden }]),
  );

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

      {/* ── Stats ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px" }}>
        {[
          { label:"TREE MEMBERS",   value:totalMembers,      color:"#6366f1", href:"/tree"   },
          { label:"INVITES SENT",   value:myInvites.length,  color:"#f59e0b", href:"/invite" },
          { label:"JOINED VIA YOU", value:joinedViaYou,      color:"#10b981", href:"/invite" },
        ].map(({ label, value, color, href }) => (
          <Link key={label} href={href} style={{
            ...card, padding:"10px 16px", borderLeft:`3px solid ${color}`,
            textDecoration:"none", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"12px",
          }}>
            <span style={{ fontSize:"11px", fontWeight:700, color:"#78716c", letterSpacing:"0.06em", textTransform:"uppercase" }}>{label}</span>
            <span style={{ fontSize:"20px", fontWeight:800, color:"#1c1917", lineHeight:1 }}>{value}</span>
          </Link>
        ))}
      </div>

      {/* ── Invite quick action ── */}
      <Link href="/invite" style={{
        ...card, padding:"16px 20px", textDecoration:"none",
        display:"flex", alignItems:"center", gap:"14px",
      }}>
        <div style={{
          width:"40px", height:"40px", borderRadius:"11px", flexShrink:0,
          background:"linear-gradient(135deg,#1a1a2e,#0f3460)",
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px",
        }}>✉️</div>
        <div>
          <p style={{ fontWeight:700, color:"#1c1917", fontSize:"15px", margin:0 }}>Invite someone</p>
          <p style={{ color:"#a8a29e", fontSize:"12px", margin:"2px 0 0" }}>Send a photo-verified invite</p>
        </div>
      </Link>

      {/* ── Two-column: tabbed content + context rail ── */}
      <div className="dashboard-body">

        {/* Left: trust gate + tabbed vault/activity */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <DashboardTrustUnitGate initialRequests={serializedTrustRequests} currentUserId={user.id} />
          <DashboardVaultTabs
            vaultNewCount={vaultNewCount}
            newPostsCount={newPosts.length}
            newCommentsCount={newComments.length}
            invites={serializedInvites}
          />
          {/* Family tree (member-owned view, collapsible — kept below tabs) */}
          {flat.length > 0 && (
            <div style={{ ...card, padding:"16px 20px" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                <span style={{ fontSize:13, fontWeight:700, color:"#1c1917" }}>
                  Family Tree
                  <span style={{
                    marginLeft:8, fontSize:11, fontWeight:700, color:"#78716c",
                    background:"#f5f4f0", borderRadius:999, padding:"2px 8px",
                  }}>{flat.length}</span>
                </span>
                <Link href="/tree" style={{ fontSize:12, color:"#6366f1", fontWeight:600, textDecoration:"none" }}>
                  View full →
                </Link>
              </div>
              <TreeList
                items={flat.slice(0, 8)}
                currentUserId={user.id}
                initialPrefs={treePrefsInitial}
                privacyNote="short"
              />
              {flat.length > 8 && (
                <Link href="/tree" style={{ display:"block", textAlign:"center", marginTop:10, fontSize:13, color:"#6366f1", textDecoration:"none", fontWeight:500 }}>
                  +{flat.length - 8} more — view full tree →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Right: context rail */}
        <DashboardContextRail
          flat={flat}
          totalMembers={totalMembers}
          trustUnits={trustUnits as any[]}
        />

      </div>
    </div>
  );
}
