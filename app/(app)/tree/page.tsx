// app/(app)/tree/page.tsx

import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { loadTreeViewPrefsSafe, loadTrustUnitsSafe } from "@/lib/tree/safe-data";
import { TreePine } from "lucide-react";
import { TreeList, type FlatNode } from "@/components/TreeList";
import { TreePageClient } from "@/components/network/TreePageClient";
import { TrustCirclesPageSection } from "@/components/trust/TrustCirclesPageSection";
import { listSentInvitesForSender } from "@/lib/invite/sentForSender";

// ── Types ─────────────────────────────────────────────────────────────────────

type Member = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photoUrl: string | null;
  role: string;
  status: string;
  createdAt: Date;
  invitedById: string | null;
  profile: { bio: string | null; familyRole: string | null; location: string | null } | null;
};

type TreeNode = {
  member: Member;
  children: TreeNode[];
};

// ── Build hierarchy from invite chain ─────────────────────────────────────────

function buildTree(
  members: Member[],
  invites: { senderId: string; recipientEmail: string; createdAt: Date }[],
  rootUserId: string | undefined,
): TreeNode[] {
  const emailToMember = new Map(members.map((m) => [m.email.toLowerCase(), m]));
  const memberById    = new Map(members.map((m) => [m.id, m]));
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
    const parentId = parentOf.get(m.id);
    if (parentId) {
      if (!childrenOf.has(parentId)) childrenOf.set(parentId, []);
      childrenOf.get(parentId)!.push(m);
    }
  }

  function buildNode(m: Member): TreeNode {
    return {
      member: m,
      children: (childrenOf.get(m.id) ?? [])
        .sort((a, b) => {
          const aInvitedAt = invitedAtOf.get(a.id)?.getTime() ?? a.createdAt.getTime();
          const bInvitedAt = invitedAtOf.get(b.id)?.getTime() ?? b.createdAt.getTime();
          return aInvitedAt - bInvitedAt;
        })
        .map(buildNode),
    };
  }

  if (rootUserId) {
    const root = memberById.get(rootUserId);
    if (root) return [buildNode(root)];
  }

  return members
    .filter((m) => !parentOf.has(m.id))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map(buildNode);
}

// ── Flatten tree → parent-thread list for rendering ───────────────────────────
// The tree is viewer-relative: current user is founder, their invitees are level
// 1, and each invitee's direct children are inserted immediately below them.

function flattenTreeByParentThread(roots: TreeNode[]): FlatNode[] {
  const result: FlatNode[] = [];

  function visit(node: TreeNode, depth: number, isLast: boolean) {
    result.push({
      member: { ...node.member, createdAt: node.member.createdAt.toISOString() },
      depth,
      isLast,
      prefixContinues: [],
    });

    node.children.forEach((child, i) => {
      visit(child, depth + 1, i === node.children.length - 1);
    });
  }

  roots.forEach((root, i) => visit(root, 0, i === roots.length - 1));

  return result;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function TreePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const [members, invites, trustUnits, treeViewPrefs, sentInvites] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        photoUrl: true,
        role: true,
        status: true,
        createdAt: true,
        invitedById: true,
        profile: { select: { bio: true, familyRole: true, location: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invite.findMany({
      where: { status: { in: ["ACCEPTED", "PENDING"] } },
      select: { senderId: true, recipientEmail: true, createdAt: true },
    }),
    loadTrustUnitsSafe(currentUser.id),
    loadTreeViewPrefsSafe(currentUser.id),
    listSentInvitesForSender(currentUser.id),
  ]);

  const pendingInvites = sentInvites
    .filter((i) => i.status === "PENDING")
    .map((i) => ({ id: i.id, recipientEmail: i.recipientEmail }));

  const roots = buildTree(members, invites, currentUser.id);
  const flat = flattenTreeByParentThread(roots);
  const treePrefsInitial = Object.fromEntries(
    treeViewPrefs.map((p) => [p.targetId, { muted: p.muted, hidden: p.hidden }]),
  );

  const railProps = {
    flat,
    totalMembers: flat.length,
    trustUnits: trustUnits.map((unit: {
      id: string;
      members: Array<{ user: { id: string; firstName: string; lastName: string; photoUrl: string | null } }>;
    }) => ({ id: unit.id, members: unit.members })),
    pendingInvites,
    currentUserId: currentUser.id,
  };

  if (flat.length === 0) {
    return (
      <TreePageClient rail={railProps}>
        <div className="app-page-body">
          <TrustCirclesPageSection trustUnits={trustUnits as never} currentUserId={currentUser.id} />
          <div style={{ textAlign: "center", padding: "48px 0", color: "#a8a29e", fontSize: "14px" }}>
            <TreePine style={{ width: 40, height: 40, margin: "0 auto 12px", color: "#d6d3d1" }} />
            <p>No members yet — invite your family!</p>
          </div>
        </div>
      </TreePageClient>
    );
  }

  return (
    <TreePageClient rail={railProps}>
      <div className="app-page-body">
        <TreeList
          items={flat}
          currentUserId={currentUser.id}
          initialPrefs={treePrefsInitial}
          privacyNote="none"
        />
        <TrustCirclesPageSection trustUnits={trustUnits as never} currentUserId={currentUser.id} />
      </div>
    </TreePageClient>
  );
}
