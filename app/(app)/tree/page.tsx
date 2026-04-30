// app/(app)/tree/page.tsx

import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth";
import { TreePine } from "lucide-react";
import { TreeList, type FlatNode } from "@/components/TreeList";
import { getTrustUnits } from "@/lib/trust";
import { TrustUnitCard } from "@/components/tree/TrustUnitCard";

// ── Types ─────────────────────────────────────────────────────────────────────

type Member = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photoUrl: string | null;
  role: string;
  createdAt: Date;
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

  for (const inv of invites) {
    const child = emailToMember.get(inv.recipientEmail.toLowerCase());
    if (child) {
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

  const [members, invites, trustUnits] = await Promise.all([
    prisma.user.findMany({
      include: { profile: { select: { bio: true, familyRole: true, location: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invite.findMany({
      where: { status: { in: ["ACCEPTED", "PENDING"] } },
      select: { senderId: true, recipientEmail: true, createdAt: true },
    }),
    currentUser ? getTrustUnits(currentUser.id) : Promise.resolve([]),
  ]);

  const roots = buildTree(members, invites, currentUser?.id);
  const flat  = flattenTreeByParentThread(roots);

  if (flat.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {trustUnits.length > 0 && (
          <div className="space-y-3">
            {trustUnits.map((unit: any) => <TrustUnitCard key={unit.id} unit={unit} />)}
          </div>
        )}
        <div style={{ textAlign: "center", padding: "64px 0", color: "#a8a29e", fontSize: "14px" }}>
          <TreePine style={{ width: 40, height: 40, margin: "0 auto 12px", color: "#d6d3d1" }} />
          <p>No members yet — invite your family!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TreeList
        items={flat}
        currentUserId={currentUser?.id}
      />
      {trustUnits.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Trust Units</h2>
          {trustUnits.map((unit: any) => <TrustUnitCard key={unit.id} unit={unit} />)}
        </div>
      )}
    </div>
  );
}
