/**
 * Disconnect a user from a prebuilt / demo Studio binding (tenant_id + owned studios).
 * Use when someone was wired to deb-dazzle (or another seed studio) and should start fresh at /studios/start.
 *
 * Dry-run: npx tsx scripts/disconnect-user-studio-binding.ts --email=you@example.com
 * Apply:   npx tsx scripts/disconnect-user-studio-binding.ts --email=you@example.com --apply
 *
 * Optional: --role=member  (reset account role after disconnecting demo owner wiring)
 */

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`${name}=`));
  return hit?.slice(name.length + 1)?.trim();
}

const email = arg("--email")?.toLowerCase();
const roleOverride = arg("--role");

async function main() {
  if (!email) {
    console.error("Usage: --email=user@example.com [--apply] [--role=member]");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      tenantId: true,
      studiosOwned: { select: { id: true, slug: true, name: true } },
    },
  });

  if (!user) {
    console.error(`No user found for ${email}`);
    process.exit(1);
  }

  console.log("Before:", {
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    role: user.role,
    tenantId: user.tenantId,
    studiosOwned: user.studiosOwned.map((s) => ({ slug: s.slug, name: s.name })),
  });

  if (!apply) {
    console.log("\nDry-run. Re-run with --apply to:");
    console.log("  - clear users.tenant_id");
    if (user.studiosOwned.length > 0) {
      console.log(`  - delete ${user.studiosOwned.length} owned studio row(s) (tiers cascade)`);
    }
    if (roleOverride) console.log(`  - set role to ${roleOverride}`);
    console.log("\nAfter apply, have them:");
    console.log("  - open /studios/start (neutral template)");
    console.log("  - clear browser localStorage keys amih_studios_* if old drafts persist");
    return;
  }

  if (user.studiosOwned.length > 0) {
    for (const studio of user.studiosOwned) {
      await prisma.studio.delete({ where: { id: studio.id } });
      console.log(`Deleted studio ${studio.slug} (${studio.id})`);
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      tenantId: null,
      ...(roleOverride ? { role: roleOverride } : {}),
    },
  });

  const after = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      role: true,
      tenantId: true,
      studiosOwned: { select: { slug: true } },
    },
  });

  console.log("After:", after);
  console.log("Done. Sidebar should route to /studios/start; use neutral template editor.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
