/**
 * Family Safe — Policy Profile Backfill Script
 *
 * Creates AihPolicyProfile rows for any users who were registered before
 * Agent 38 wired profile creation into the registration route.
 *
 * Usage:
 *   npx tsx scripts/aihsafe/backfill-policy-profiles.ts [--dry-run]
 *
 * Options:
 *   --dry-run   List affected users without writing any rows (safe to run anytime)
 *
 * Safety:
 *   - Idempotent: skips users who already have a profile row
 *   - Never deletes or modifies existing profiles
 *   - Run --dry-run first to confirm the affected user set
 *   - Do NOT run against production without approval — see policy-backfill-runbook.md
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { prisma } from "@/lib/db/prisma";
import { ensurePolicyProfile } from "@/lib/aihsafe/policy";

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  console.log(`\n🔍 Family Safe — Policy Profile Backfill${DRY_RUN ? " (DRY RUN)" : ""}`);
  console.log("─".repeat(60));

  // Find all users without a policy profile row.
  const users = await prisma.user.findMany({
    where:  { aihPolicyProfile: null },
    select: { id: true, email: true, dateOfBirth: true, role: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${users.length} user(s) without a policy profile.\n`);

  if (users.length === 0) {
    console.log("✅ All users already have policy profiles. Nothing to do.");
    return;
  }

  if (DRY_RUN) {
    console.log("Users that would receive a policy profile:");
    for (const u of users) {
      const dob = u.dateOfBirth ? u.dateOfBirth.toISOString().slice(0, 10) : "no DOB";
      console.log(`  • ${u.email} (${u.role}, ${dob})`);
    }
    console.log(`\nDry run complete. Run without --dry-run to apply.`);
    return;
  }

  let created = 0;
  let failed  = 0;

  for (const user of users) {
    try {
      await ensurePolicyProfile(user.id, user.dateOfBirth ?? null);
      created++;
      const dob = user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : "no DOB";
      console.log(`  ✅ ${user.email} (${user.role}, ${dob})`);
    } catch (err) {
      failed++;
      console.error(`  ❌ ${user.email} (${user.id}):`, err);
    }
  }

  console.log("\n" + "─".repeat(60));
  console.log(`Backfill complete: ${created} created, ${failed} failed.`);

  if (failed > 0) {
    console.warn(`\n⚠️  ${failed} profile(s) failed. Review errors above and re-run.`);
    process.exit(1);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
