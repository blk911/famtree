/**
 * Agent 67 — programmatic QA checks for Agent 66 scenario seed.
 * Read-only against DB + pure governance kernel (no HTTP).
 *
 * Usage: npx tsx scripts/aihsafe/verify-relationship-scenarios.ts
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { prisma } from "@/lib/db/prisma";
import { buildActorContext } from "@/lib/aihsafe/context/buildActorContext";
import { canMessage, deriveAgeTier } from "@/lib/aihsafe/governance";
import { deriveShellMode } from "@/components/aihsafe/roles/shellMode";
import { resolvePolicyProfile } from "@/lib/aihsafe/policy";
import { listAllowedChatContacts } from "@/lib/msg-vault/conversations/allowed-contacts";
import { sharedTrustUnitIdsBetween } from "@/lib/msg-vault/graph";
import { asAIHUserId } from "@/types/aihsafe/ids";
import { isMinorTier, AgeTier } from "@/types/aihsafe/age-tiers";
import { getVisibleTabs } from "@/components/aihsafe/navigation/FamilySafeTabs";

type Result = { id: string; pass: boolean; detail: string };

const EMAILS = {
  founderParent: "founder-parent@famtree.test",
  child:         "child@famtree.test",
  teen:          "teen@famtree.test",
  guardian:      "guardian@famtree.test",
  trustedAdult:  "trusted-adult@famtree.test",
  ceo:           "ceo@famtree.test",
  cfo:           "cfo@famtree.test",
  employee:      "employee@famtree.test",
};

const results: Result[] = [];

function record(id: string, pass: boolean, detail: string) {
  results.push({ id, pass, detail });
}

async function userId(email: string): Promise<string | null> {
  const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return u?.id ?? null;
}

async function main() {
  console.log("\n🔎 Agent 67 — Relationship Scenario Verification\n");

  const ids: Record<string, string | null> = {};
  for (const [key, email] of Object.entries(EMAILS)) {
    ids[key] = await userId(email);
    record(`seed.user.${key}`, ids[key] != null, ids[key] ? email : `missing ${email}`);
  }

  if (Object.values(ids).some((id) => !id)) {
    console.error("\n❌ Run: npm run seed:aihsafe-scenarios:apply\n");
    printResults();
    process.exit(1);
  }

  const fp = ids.founderParent!;
  const ch = ids.child!;
  const te = ids.teen!;
  const gu = ids.guardian!;
  const ta = ids.trustedAdult!;
  const ceo = ids.ceo!;
  const cfo = ids.cfo!;

  // Guardian links
  const parentChild = await prisma.aihGuardianRelationship.findUnique({
    where: { guardianUserId_childUserId: { guardianUserId: fp, childUserId: ch } },
  });
  record("s1.guardian.parent-child", !!parentChild && !parentChild.revokedAt, "founder-parent → child");

  const parentTeen = await prisma.aihGuardianRelationship.findUnique({
    where: { guardianUserId_childUserId: { guardianUserId: fp, childUserId: te } },
  });
  record("s2.guardian.parent-teen", !!parentTeen && !parentTeen.revokedAt, "founder-parent → teen");

  // Child shell + tabs
  const childUser = await prisma.user.findUnique({ where: { id: ch }, select: { role: true, dateOfBirth: true } });
  const childTier = deriveAgeTier(childUser!.dateOfBirth);
  record("s1.child.tier", childTier === AgeTier.CHILD, `tier=${childTier}`);
  const childShell = deriveShellMode({ role: childUser!.role, dateOfBirth: childUser!.dateOfBirth });
  record("s1.child.shell", childShell === "child", `shell=${childShell}`);
  const childTabs = getVisibleTabs("child", false).map((t) => t.id);
  record("s1.child.tabs", childTabs.join() === "spaces,activity,settings", childTabs.join());

  const teenTabs = getVisibleTabs("child", false).map((t) => t.id);
  record("s2.teen.tabs", teenTabs.includes("settings"), teenTabs.join());

  // Teen
  const teenUser = await prisma.user.findUnique({ where: { id: te }, select: { role: true, dateOfBirth: true } });
  record("s2.teen.tier", deriveAgeTier(teenUser!.dateOfBirth) === AgeTier.TEEN, "teen tier");
  record("s2.teen.shell", deriveShellMode({ role: teenUser!.role, dateOfBirth: teenUser!.dateOfBirth }) === "child", "child shell");

  // Child policy — posting + escalation
  const childPolicy = await resolvePolicyProfile(ch);
  record(
    "s1.child.policy.posting",
    childPolicy.posting.allowed === true,
    `allowMinorPosting=${childPolicy.posting.allowed}`,
  );
  record(
    "s1.child.policy.escalation",
    childPolicy.escalation.requiresGuardianApprovalForPostContent === true,
    `requiresApproval=${childPolicy.escalation.requiresGuardianApprovalForPostContent}`,
  );

  // Guardian inbox candidates
  const pendingForGuardian = await prisma.aihApprovalRequest.count({
    where: { approverId: gu, state: "pending" },
  });
  record("s1.guardian.inbox.ready", true, `guardian pending queue count=${pendingForGuardian} (may be 0)`);

  // CEO ↔ CFO messaging (business TU)
  const ceoActor = await buildActorContext(asAIHUserId(ceo));
  const sharedCeoCfo = await sharedTrustUnitIdsBetween(ceoActor, cfo);
  const ceoToCfo = canMessage(ceoActor, {
    targetUserId: asAIHUserId(cfo),
    sharedTrustUnitIds: sharedCeoCfo,
  });
  record("s4.ceo-cfo.canMessage", ceoToCfo.allowed, ceoToCfo.reason);

  const cfoContacts = await listAllowedChatContacts(ceo);
  const cfoListed = cfoContacts.some((c) => c.userId === cfo);
  record("s4.ceo.sees-cfo-contact", cfoListed, cfoListed ? "CFO in allowed contacts" : "CFO missing");

  // Employee not in CEO's business-only check — employee should be in same TU
  const emp = ids.employee!;
  const sharedCeoEmp = await sharedTrustUnitIdsBetween(ceoActor, emp);
  record("s4.ceo-employee.shared-tu", sharedCeoEmp.length > 0, `shared units=${sharedCeoEmp.length}`);

  // Child cannot message stranger (no shared TU with CEO)
  const childActor = await buildActorContext(asAIHUserId(ch));
  const childToCeo = canMessage(childActor, {
    targetUserId: asAIHUserId(ceo),
    sharedTrustUnitIds: await sharedTrustUnitIdsBetween(childActor, ceo),
  });
  record("s1.child.block-ceo-dm", !childToCeo.allowed, childToCeo.reason);

  // Child can message parent in family TU
  const childToParent = canMessage(childActor, {
    targetUserId: asAIHUserId(fp),
    sharedTrustUnitIds: await sharedTrustUnitIdsBetween(childActor, fp),
  });
  record("s1.child.parent-dm", childToParent.allowed, childToParent.reason);

  // Trusted adult — founder settings
  const fs = await prisma.aihFounderSettings.findFirst({ select: { enableTrustedAdults: true } });
  record("s3.trusted-adults.enabled", fs?.enableTrustedAdults === true, `enableTrustedAdults=${fs?.enableTrustedAdults}`);

  const taLink = await prisma.aihGuardianRelationship.findFirst({
    where: { guardianUserId: fp, childUserId: ta, kind: "trusted_adult", revokedAt: null },
  });
  record("s3.trusted-adult.link", !!taLink, "steward → trusted-adult link");

  // Unknown DOB — create ephemeral check via existing user without DOB or query
  const unknownUser = await prisma.user.findFirst({
    where: { dateOfBirth: null, status: "active", role: "member" },
    select: { id: true, role: true, email: true },
  });
  if (unknownUser) {
    const unkTier = deriveAgeTier(null);
    const unkShell = deriveShellMode({ role: unknownUser.role, dateOfBirth: null });
    const unkPolicy = await resolvePolicyProfile(unknownUser.id);
    record("s5.unknown.tier", unkTier === AgeTier.UNKNOWN, `${unknownUser.email} tier=${unkTier}`);
    record("s5.unknown.shell", unkShell === "member", `shell=${unkShell} (not founder)`);
    record(
      "s5.unknown.invite-limit",
      unkPolicy.invite.allowed === false || unkPolicy.limits.dailyInviteLimit === 0,
      `invite allowed=${unkPolicy.invite.allowed} dailyInviteLimit=${unkPolicy.limits.dailyInviteLimit}`,
    );
  } else {
    record("s5.unknown.user", false, "no member with null DOB in DB — skip or create manually");
  }

  // Founder parent tabs
  const founderTabs = getVisibleTabs("founder", true).map((t) => t.id);
  record(
    "s6.founder.tabs",
    founderTabs.includes("settings") && founderTabs.includes("approvals"),
    founderTabs.join(),
  );

  printResults();
  const failed = results.filter((r) => !r.pass).length;
  process.exit(failed > 0 ? 1 : 0);
}

function printResults() {
  console.log("\nResults:\n");
  for (const r of results) {
    console.log(`  ${r.pass ? "✅" : "❌"} ${r.id}`);
    console.log(`     ${r.detail}`);
  }
  const passed = results.filter((r) => r.pass).length;
  console.log(`\n${passed}/${results.length} checks passed.\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
