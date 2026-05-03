// app/(app)/dashboard/page.tsx
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquare, MessageCircle } from "lucide-react";
import { getPendingTrustRequests, getTrustUnits } from "@/lib/trust";
import { TrustRequestsPanel } from "@/components/dashboard/TrustRequestsPanel";
import { ProfileCompletionPrompt } from "@/components/dashboard/ProfileCompletionPrompt";
import { IncomingIdentityAcks } from "@/components/dashboard/IncomingIdentityAcks";
import { CollapsibleSection } from "@/components/dashboard/CollapsibleSection";
import { TreeList, type FlatNode } from "@/components/TreeList";

// ── Tree helpers (mirror of /tree page) ────────────────────────────────────────
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

  // Primary: use the durable invitedById field on each user
  for (const m of members) {
    if (m.invitedById) parentOf.set(m.id, m.invitedById);
  }
  // Fallback: derive from invite records (covers pre-migration rows)
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

const STATUS_COLOR: Record<string,string> = {
  PENDING:"#f59e0b", ACCEPTED:"#10b981", EXPIRED:"#ef4444", CANCELLED:"#9ca3af",
};
const STATUS_BG: Record<string,string> = {
  PENDING:"#fef3c7", ACCEPTED:"#d1fae5", EXPIRED:"#fee2e2", CANCELLED:"#f3f4f6",
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role === "founder" || user.role === "admin") redirect("/admin");

  // Baseline: what was new since they last logged in (prev session)
  // lastLoginAt is set ON login, so we use the stored value (from the previous login)
  // For first-ever login it will be null → fall back to 24 h window
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
    prisma.invite.findMany({ where:{ senderId:user.id }, orderBy:{ createdAt:"desc" }, take:6 }),
    getPendingTrustRequests(user.id),
    getTrustUnits(user.id),
    prisma.$queryRaw<Array<{
      dashboardProfilePromptDismissedAt: Date | null;
      dashboardProfilePromptSeenCount: number;
    }>>`
      SELECT "dashboardProfilePromptDismissedAt", "dashboardProfilePromptSeenCount"
      FROM "profiles" WHERE "userId" = ${user.id} LIMIT 1
    `,
    // tree data
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
    // vault: new posts by others since last login
    prisma.post.findMany({
      where: { createdAt:{ gt: lastSeen }, profile:{ userId:{ not: user.id } } },
      select: { id:true, body:true, profile:{ select:{ userId:true } } },
      orderBy: { createdAt:"desc" },
      take: 10,
    }),
    // vault: new comments by others since last login
    prisma.comment.findMany({
      where: { createdAt:{ gt: lastSeen }, userId:{ not: user.id } },
      select: { id:true, postId:true },
      orderBy: { createdAt:"desc" },
      take: 10,
    }),
    prisma.treeViewPreference.findMany({
      where: { viewerId: user.id },
      select: { targetId: true, muted: true, hidden: true },
    }),
  ]);

  const joinedViaYou = myInvites.filter((i) => i.status === "REGISTERED").length;
  const vaultNewCount    = newPosts.length + newComments.length;

  const serializedTrustRequests = trustRequests.map((r: any) => ({
    id: r.id, createdBy: r.createdBy,
    members: r.members.map((m: any) => m.user),
  }));

  const missingProfilePhoto = !user.photoUrl;
  const promptState = promptRows[0];
  const showProfilePrompt = missingProfilePhoto
    && !promptState?.dashboardProfilePromptDismissedAt
    && (promptState?.dashboardProfilePromptSeenCount ?? 0) < 3;

  if (showProfilePrompt) {
    await prisma.$executeRaw`
      UPDATE "profiles"
      SET "dashboardProfilePromptSeenCount" = "dashboardProfilePromptSeenCount" + 1,
          "updatedAt" = now()
      WHERE "userId" = ${user.id}
    `;
  }

  // Build tree for dashboard panel
  const roots = buildTree(members, invites, user.id);
  const flat  = flattenTree(roots);
  const treePrefsInitial = Object.fromEntries(
    treeViewPrefs.map((p) => [p.targetId, { muted: p.muted, hidden: p.hidden }]),
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>
      {/* Profile completion banner */}
      {showProfilePrompt && <ProfileCompletionPrompt />}

      <IncomingIdentityAcks />

      {/* ── Stats ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px" }}>
        {[
          { label:"TREE MEMBERS",   value:totalMembers,      color:"#6366f1", href:"/tree"   },
          { label:"INVITES SENT",   value:myInvites.length,   color:"#f59e0b", href:"/invite" },
          { label:"JOINED VIA YOU", value:joinedViaYou,    color:"#10b981", href:"/invite" },
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

      {/* ── Quick actions ── */}
      <div>
        <h2 style={{ fontSize:"14px", fontWeight:700, color:"#78716c", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:"10px" }}>
          Quick actions
        </h2>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" }}>

          {/* Invite someone */}
          <Link href="/invite" style={{
            ...card, padding:"18px 20px", textDecoration:"none",
            display:"flex", alignItems:"center", gap:"14px",
          }}>
            <div style={{
              width:"42px", height:"42px", borderRadius:"12px", flexShrink:0,
              background:"linear-gradient(135deg,#1a1a2e,#0f3460)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:"20px",
            }}>✉️</div>
            <div>
              <p style={{ fontWeight:700, color:"#1c1917", fontSize:"15px", margin:0 }}>Invite someone</p>
              <p style={{ color:"#a8a29e", fontSize:"12px", margin:"2px 0 0" }}>Send a photo invite</p>
            </div>
          </Link>

          {/* Vault message monitor */}
          <Link href="/family-vault/posts" style={{
            ...card, padding:"18px 20px", textDecoration:"none",
            display:"flex", alignItems:"center", gap:"14px",
            borderLeft: vaultNewCount > 0 ? "3px solid #6366f1" : "1px solid #ece9e3",
          }}>
            <div style={{
              width:"42px", height:"42px", borderRadius:"12px", flexShrink:0, position:"relative",
              background: vaultNewCount > 0
                ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
                : "linear-gradient(135deg,#e7e5e4,#d6d3d1)",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <MessageSquare style={{ width:20, height:20, color:"white" }} />
              {vaultNewCount > 0 && (
                <span style={{
                  position:"absolute", top:"-4px", right:"-4px",
                  background:"#ef4444", color:"white", borderRadius:"999px",
                  fontSize:"10px", fontWeight:800, padding:"1px 5px", lineHeight:1.4,
                }}>
                  {vaultNewCount}
                </span>
              )}
            </div>
            <div>
              <p style={{ fontWeight:700, color:"#1c1917", fontSize:"15px", margin:0 }}>VAULT Messages</p>
              <p style={{
                color: vaultNewCount > 0 ? "#6366f1" : "#a8a29e",
                fontSize:"12px", margin:"2px 0 0", fontWeight: vaultNewCount > 0 ? 600 : 400,
              }}>
                {vaultNewCount > 0 ? `${vaultNewCount} new since last visit` : "· all current"}
              </p>
            </div>
          </Link>

        </div>
      </div>

      <TrustRequestsPanel requests={serializedTrustRequests} currentUserId={user.id} />

      {/* ── Family Tree (collapsible) ── */}
      <CollapsibleSection
        title="Family Tree"
        defaultOpen={false}
        count={flat.length}
        rightLabel={<Link href="/tree" style={{ color:"#6366f1", fontSize:"13px", textDecoration:"none", fontWeight:500 }}>View full →</Link>}
      >
        {flat.length > 0
          ? <TreeList items={flat.slice(0, 8)} currentUserId={user.id} initialPrefs={treePrefsInitial} privacyNote="short" />
          : <p style={{ fontSize:"14px", color:"#a8a29e", textAlign:"center", padding:"16px 0" }}>No members yet — invite your family!</p>
        }
        {flat.length > 8 && (
          <Link href="/tree" style={{ display:"block", textAlign:"center", marginTop:"10px", fontSize:"13px", color:"#6366f1", textDecoration:"none", fontWeight:500 }}>
            + {flat.length - 8} more — view full tree →
          </Link>
        )}
      </CollapsibleSection>

      {/* ── Trust Units (collapsible) ── */}
      {trustUnits.length > 0 && (
        <CollapsibleSection
          title="Trust Units"
          defaultOpen={false}
          count={trustUnits.length}
          rightLabel={<Link href="/tree" style={{ color:"#6366f1", fontSize:"13px", textDecoration:"none", fontWeight:500 }}>View tree →</Link>}
        >
          <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
            {(trustUnits as any[]).map((unit) => {
              const names = unit.members
                .map((m: any) => `${m.user.firstName} ${m.user.lastName}`)
                .join(" · ");
              const inits = (fn: string, ln: string) => `${fn[0] ?? ""}${ln[0] ?? ""}`.toUpperCase();
              return (
                <div key={unit.id} style={{
                  display:"flex", alignItems:"center", justifyContent:"space-between",
                  gap:"12px", padding:"9px 12px",
                  background:"#faf5ff", border:"1px solid #e9d5ff", borderRadius:"10px",
                }}>
                  {/* Avatars */}
                  <div style={{ display:"flex", alignItems:"center", gap:"-4px", flexShrink:0 }}>
                    {unit.members.slice(0, 3).map((m: any, i: number) => (
                      <div key={m.user.id} style={{
                        width:"26px", height:"26px", borderRadius:"50%",
                        overflow:"hidden", border:"2px solid white",
                        background:"linear-gradient(135deg,#7c3aed,#c026d3)",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:"10px", fontWeight:700, color:"white",
                        marginLeft: i > 0 ? "-6px" : 0, flexShrink:0,
                      }}>
                        {m.user.photoUrl
                          ? <img src={m.user.photoUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                          : inits(m.user.firstName, m.user.lastName)
                        }
                      </div>
                    ))}
                  </div>
                  {/* Names */}
                  <span style={{ flex:1, fontSize:"13px", fontWeight:600, color:"#1c1917", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {names}
                  </span>
                  {/* Status + link */}
                  <span style={{ fontSize:"11px", fontWeight:600, color:"#7c3aed", background:"#ede9fe", borderRadius:"999px", padding:"2px 8px", flexShrink:0 }}>
                    Active
                  </span>
                  <Link
                    href={`/family-vault/private?unit=${unit.id}`}
                    title="Open TU conversation"
                    style={{ display:"flex", alignItems:"center", justifyContent:"center", color:"#7c3aed", flexShrink:0 }}
                  >
                    <MessageCircle style={{ width:15, height:15 }} />
                  </Link>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* ── Recent Invites (collapsible) ── */}
      {myInvites.length > 0 && (
        <CollapsibleSection
          title="Recent Invites"
          defaultOpen={true}
          count={myInvites.length}
          rightLabel={<Link href="/invite" style={{ color:"#6366f1", fontSize:"13px", textDecoration:"none", fontWeight:500 }}>View all →</Link>}
        >
          <div>
            {myInvites.map((inv, i) => (
              <div key={inv.id} style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"11px 0",
                borderBottom: i < myInvites.length - 1 ? "1px solid #f5f4f0" : "none",
              }}>
                <div>
                  <span style={{ fontSize:"14px", fontWeight:500, color:"#1c1917" }}>
                    {inv.recipientEmail}
                  </span>
                  <span style={{ fontSize:"11px", color:"#a8a29e", marginLeft:"10px" }}>
                    {new Date(inv.createdAt).toLocaleDateString("en-US",{ month:"short", day:"numeric" })}
                  </span>
                </div>
                <span style={{
                  display:"inline-flex", alignItems:"center",
                  padding:"3px 10px", borderRadius:"999px",
                  fontSize:"11px", fontWeight:600,
                  color: STATUS_COLOR[inv.status] ?? "#78716c",
                  background: STATUS_BG[inv.status] ?? "#f5f5f4",
                }}>
                  {inv.status.charAt(0) + inv.status.slice(1).toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}
