/**
 * Neutralize legacy bonds and Trust Units that involve admin/system accounts
 * (see `isHumanTrustEligible` in lib/trust/isHumanTrustEligible.ts).
 *
 * Run from repo root:
 *   npm run trust:scrub-admin
 *
 * Requires DATABASE_URL. Uses status transitions only (no deletes).
 */

import { PrismaClient } from "@prisma/client";
import { isHumanTrustEligible } from "../lib/trust/isHumanTrustEligible";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, role: true, email: true },
  });

  const ineligibleIds = new Set(
    users.filter((u) => !isHumanTrustEligible(u)).map((u) => u.id),
  );

  console.log(`[scrub-admin-trust] Ineligible user ids: ${ineligibleIds.size}`);
  for (const u of users) {
    if (ineligibleIds.has(u.id)) {
      console.log(`  INELIGIBLE id=${u.id} role=${u.role} email=${u.email}`);
    }
  }

  const bonds = await prisma.connectionRequest.findMany({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: { in: Array.from(ineligibleIds) } },
        { targetId: { in: Array.from(ineligibleIds) } },
      ],
    },
    select: { id: true, requesterId: true, targetId: true },
  });

  for (const b of bonds) {
    await prisma.connectionRequest.update({
      where: { id: b.id },
      data: { status: "REVOKED_SYSTEM_EXCLUDED" },
    });
    console.log(
      `[scrub-admin-trust] connection_request ${b.id} → REVOKED_SYSTEM_EXCLUDED (${b.requesterId} ↔ ${b.targetId})`,
    );
  }

  const pendingProposals = await prisma.trustUnitRequest.findMany({
    where: { status: "PENDING" },
    include: { members: true },
  });

  for (const p of pendingProposals) {
    const touches =
      ineligibleIds.has(p.createdById) ||
      p.members.some((m) => ineligibleIds.has(m.userId));
    if (!touches) continue;

    await prisma.trustUnitRequest.update({
      where: { id: p.id },
      data: { status: "CANCELLED_SYSTEM_EXCLUDED" },
    });
    console.log(`[scrub-admin-trust] trust_unit_requests ${p.id} → CANCELLED_SYSTEM_EXCLUDED`);
  }

  const activeUnits = await prisma.trustUnit.findMany({
    where: { status: "ACTIVE" },
    include: { members: true },
  });

  for (const tu of activeUnits) {
    const touches = tu.members.some((m) => ineligibleIds.has(m.userId));
    if (!touches) continue;

    await prisma.trustUnit.update({
      where: { id: tu.id },
      data: { status: "NEEDS_REFORM_SYSTEM_EXCLUDED" },
    });
    console.log(`[scrub-admin-trust] trust_units ${tu.id} → NEEDS_REFORM_SYSTEM_EXCLUDED`);
  }

  console.log("[scrub-admin-trust] Done.");
}

main()
  .catch((err) => {
    console.error("[scrub-admin-trust] Fatal:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
