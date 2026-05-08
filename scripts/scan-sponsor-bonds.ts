/**
 * Scan sponsor↔member bonds implied by REGISTERED/ACCEPTED invites and `invitedById`
 * against `connection_requests` (ACCEPTED). Use after noticing missing bonds on Family Units /
 * Private Feed while adjacency still sees invite edges.
 *
 * Run:  npm run bonds:scan
 * Fix:  npm run bonds:fix   (upserts sponsor→member ACCEPTED rows; local/staging only unless you intend prod)
 */
import { PrismaClient } from "@prisma/client";
import { normalizeInviteEmail } from "../lib/invite";

const prisma = new PrismaClient();

function pairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

async function main() {
  const fix = process.argv.includes("--fix");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      invitedById: true,
    },
  });
  const emailToId = new Map(users.map((u) => [normalizeInviteEmail(u.email), u.id]));
  const userById = new Map(users.map((u) => [u.id, u]));

  const conns = await prisma.connectionRequest.findMany({
    where: { status: "ACCEPTED" },
    select: { requesterId: true, targetId: true },
  });
  const bondedPairs = new Set(conns.map((c) => pairKey(c.requesterId, c.targetId)));

  type Gap = {
    kind: "invite_missing_connection" | "invite_unresolved_email" | "invitedBy_missing_connection";
    sponsorId: string;
    memberId: string;
    detail: string;
  };

  const gaps: Gap[] = [];
  const seen = new Set<string>();

  function pushGap(g: Gap): void {
    const k = `${g.kind}:${pairKey(g.sponsorId, g.memberId)}`;
    if (seen.has(k)) return;
    seen.add(k);
    gaps.push(g);
  }

  const invites = await prisma.invite.findMany({
    where: { status: { in: ["ACCEPTED", "REGISTERED"] } },
    select: {
      id: true,
      senderId: true,
      recipientEmail: true,
      status: true,
    },
  });

  for (const inv of invites) {
    const mid = emailToId.get(normalizeInviteEmail(inv.recipientEmail));
    const sponsor = userById.get(inv.senderId);
    if (!mid) {
      gaps.push({
        kind: "invite_unresolved_email",
        sponsorId: inv.senderId,
        memberId: `unresolved:${inv.id}`,
        detail: `invite ${inv.id} (${inv.status}) recipientEmail=${inv.recipientEmail} — no user email match`,
      });
      continue;
    }
    const pk = pairKey(inv.senderId, mid);
    if (!bondedPairs.has(pk)) {
      const member = userById.get(mid);
      pushGap({
        kind: "invite_missing_connection",
        sponsorId: inv.senderId,
        memberId: mid,
        detail: `${inv.status}: ${sponsor?.email ?? inv.senderId} → ${member?.email ?? mid}`,
      });
      if (fix) {
        await prisma.connectionRequest.upsert({
          where: {
            requesterId_targetId: {
              requesterId: inv.senderId,
              targetId: mid,
            },
          },
          create: {
            requesterId: inv.senderId,
            targetId: mid,
            status: "ACCEPTED",
          },
          update: { status: "ACCEPTED" },
        });
        bondedPairs.add(pk);
      }
    }
  }

  for (const u of users) {
    if (!u.invitedById) continue;
    const pk = pairKey(u.invitedById, u.id);
    if (!bondedPairs.has(pk)) {
      const sponsor = userById.get(u.invitedById);
      pushGap({
        kind: "invitedBy_missing_connection",
        sponsorId: u.invitedById,
        memberId: u.id,
        detail: `invitedById: ${sponsor?.email ?? u.invitedById} → ${u.email}`,
      });
      if (fix) {
        await prisma.connectionRequest.upsert({
          where: {
            requesterId_targetId: {
              requesterId: u.invitedById,
              targetId: u.id,
            },
          },
          create: {
            requesterId: u.invitedById,
            targetId: u.id,
            status: "ACCEPTED",
          },
          update: { status: "ACCEPTED" },
        });
        bondedPairs.add(pk);
      }
    }
  }

  const hintEmails = ["spencer", "oleta", "bitnetpro", "wendt"];
  const relevant = gaps.filter((g) =>
    hintEmails.some((h) => g.detail.toLowerCase().includes(h)),
  );

  console.log(
    JSON.stringify(
      {
        scannedAt: new Date().toISOString(),
        fix,
        gapCount: gaps.length,
        hintsMatchedInDetail: relevant.length,
        gaps,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
