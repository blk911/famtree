/**
 * Agent 70 — visible governance settings QA (read-only DB + pure helpers).
 * Usage: npx tsx scripts/aihsafe/verify-visible-governance-settings.ts
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { prisma } from "@/lib/db/prisma";
import { deriveShellMode } from "@/components/aihsafe/roles/shellMode";
import {
  settingsTabLabel,
  canEditFamilyGovernance,
} from "@/components/aihsafe/roles/governanceView";
import { getVisibleTabs } from "@/components/aihsafe/navigation/FamilySafeTabs";
import { resolvePolicyProfile } from "@/lib/aihsafe/policy";
import { isMinorTier } from "@/types/aihsafe/age-tiers";

type Result = { id: string; pass: boolean; detail: string };
const results: Result[] = [];

function record(id: string, pass: boolean, detail: string) {
  results.push({ id, pass, detail });
}

async function userByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, dateOfBirth: true },
  });
}

async function main() {
  console.log("\n🔎 Agent 70 — Visible Governance Settings QA\n");

  const founder = await userByEmail("founder@famtree.test");
  const child = await userByEmail("child@famtree.test");
  const teen = await userByEmail("teen@famtree.test");
  const guardian = await userByEmail("guardian@famtree.test");
  const employee = await userByEmail("employee@famtree.test");
  const unknown = await prisma.user.findFirst({
    where: { dateOfBirth: null, status: "active", role: "member" },
    select: { id: true, email: true, role: true, dateOfBirth: true },
  });

  for (const [label, u] of [
    ["founder", founder],
    ["child", child],
    ["teen", teen],
    ["guardian", guardian],
    ["employee", employee],
  ] as const) {
    record(`seed.${label}`, u != null, u?.email ?? "missing — run seed:aihsafe-scenarios:apply");
  }

  if (!founder || !child || !teen) {
    printResults();
    process.exit(1);
  }

  const family = await prisma.aihFounderSettings.findFirst();
  if (!family) {
    record("family.settings.row", false, "no AihFounderSettings singleton");
  } else {
    record("family.settings.row", true, "singleton present");
  }

  // Tab visibility
  const founderShell = deriveShellMode(founder);
  record("founder.shell", founderShell === "founder", founderShell);
  const founderTabs = getVisibleTabs("founder", true).map((t) => t.id);
  record(
    "founder.tabs",
    founderTabs.includes("settings") && founderTabs.includes("approvals"),
    founderTabs.join(),
  );
  record(
    "founder.tabLabel",
    settingsTabLabel("founder") === "Msg Rules",
    settingsTabLabel("founder"),
  );
  record(
    "founder.canEdit",
    canEditFamilyGovernance("founder", founder.role),
    `role=${founder.role}`,
  );

  const childShell = deriveShellMode(child);
  const childTabs = getVisibleTabs("child", false).map((t) => t.id);
  record("child.shell", childShell === "child", childShell);
  record(
    "child.tabs",
    childTabs.join() === "spaces,activity,settings",
    childTabs.join(),
  );
  record(
    "child.canEdit",
    !canEditFamilyGovernance("child", child.role),
    `blocked for child shell`,
  );

  const teenShell = deriveShellMode(teen);
  const teenTabs = getVisibleTabs("child", false).map((t) => t.id);
  record("teen.shell", teenShell === "child", teenShell);
  record("teen.tabs", teenTabs.includes("settings"), teenTabs.join());
  record(
    "child.tabLabel",
    settingsTabLabel("child") === "Boundaries",
    settingsTabLabel("child"),
  );
  record(
    "member.tabLabel",
    settingsTabLabel("member") === "Msg Rules",
    settingsTabLabel("member"),
  );

  if (guardian) {
    const gTabs = getVisibleTabs("member", true).map((t) => t.id);
    record(
      "guardian.tabs",
      gTabs.includes("settings") && gTabs.includes("approvals"),
      gTabs.join(),
    );
    record(
      "guardian.canEdit",
      !canEditFamilyGovernance("member", guardian.role),
      `role=${guardian.role}`,
    );
  }

  if (employee) {
    const eTabs = getVisibleTabs("member", false).map((t) => t.id);
    record(
      "member.tabs",
      eTabs.includes("settings") && !eTabs.includes("approvals"),
      eTabs.join(),
    );
  }

  if (unknown) {
    const uShell = deriveShellMode(unknown);
    const uTabs = getVisibleTabs("member", false).map((t) => t.id);
    record("unknown.shell", uShell === "member", `${unknown.email} shell=${uShell}`);
    record("unknown.tabs.settings", uTabs.includes("settings"), uTabs.join());
    record(
      "unknown.canEdit",
      !canEditFamilyGovernance(uShell, unknown.role),
      "locked member view",
    );
  }

  // Display vs enforcement (child)
  const childPolicy = await resolvePolicyProfile(child.id);
  if (family) {
    record(
      "enforce.child.posting-vs-family",
      childPolicy.posting.allowed === family.allowMinorPosting,
      `policy=${childPolicy.posting.allowed} family=${family.allowMinorPosting}`,
    );
    record(
      "enforce.child.guardian-approval",
      childPolicy.escalation.requiresGuardianApprovalForPostContent ===
        (family.requireGuardianApprovalForMinors &&
          isMinorTier(childPolicy.ageTierSnapshot as "child" | "teen")),
      `escalation=${childPolicy.escalation.requiresGuardianApprovalForPostContent}`,
    );
    record(
      "enforce.trusted-adults.flag",
      family.enableTrustedAdults === true,
      `enableTrustedAdults=${family.enableTrustedAdults}`,
    );
    record(
      "enforce.private-threads.flag",
      family.enablePrivateThreads === true,
      `enablePrivateThreads=${family.enablePrivateThreads}`,
    );
  }

  const teenPolicy = await resolvePolicyProfile(teen.id);
  record(
    "enforce.teen.guardian-approval",
    teenPolicy.escalation.requiresGuardianApprovalForPostContent === true,
    `requiresApproval=${teenPolicy.escalation.requiresGuardianApprovalForPostContent}`,
  );

  if (founder) {
    const founderPolicy = await resolvePolicyProfile(founder.id);
    record(
      "enforce.founder.posting",
      founderPolicy.posting.allowed === true,
      `adult posting allowed=${founderPolicy.posting.allowed}`,
    );
  }

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
