/**
 * Family Safe — dev-only relationship scenario seed
 *
 * Creates reusable test users, guardian links, family/trust units, and policy profiles
 * for manual QA of Family Safe / Msg Vault governance.
 *
 * Usage:
 *   npx tsx scripts/aihsafe/seed-relationship-scenarios.ts           # dry-run (default)
 *   npx tsx scripts/aihsafe/seed-relationship-scenarios.ts --apply
 *
 * Safety:
 *   - Refuses production unless ALLOW_AIHSAFE_SCENARIO_SEED=1
 *   - Idempotent upserts by email
 *   - Does not delete or modify unrelated users
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { deriveAgeTier } from "@/lib/aihsafe/governance";
import { ensurePolicyProfile } from "@/lib/aihsafe/policy";
const APPLY = process.argv.includes("--apply");
const TEST_PASSWORD = "RelationshipTest1!";

// ─── Scenario users (emails use @famtree.test for deliverability in dev) ───────

/** Fixed Jan 10 DOB so age tier is stable regardless of run date. */
function dobForAge(age: number): Date {
  const year = new Date().getUTCFullYear() - age;
  return new Date(Date.UTC(year, 0, 10));
}

type ScenarioUserDef = {
  key:         string;
  email:       string;
  firstName:   string;
  lastName:    string;
  role:        string;
  dateOfBirth: Date | null;
};

const USER_DEFS: ScenarioUserDef[] = [
  {
    key:         "founderParent",
    email:       "founder-parent@famtree.test",
    firstName:   "Pat",
    lastName:    "Steward",
    role:        "founder",
    dateOfBirth: dobForAge(42),
  },
  {
    key:         "child",
    email:       "child@famtree.test",
    firstName:   "Casey",
    lastName:    "Child",
    role:        "member",
    dateOfBirth: dobForAge(10),
  },
  {
    key:         "teen",
    email:       "teen@famtree.test",
    firstName:   "Taylor",
    lastName:    "Teen",
    role:        "member",
    dateOfBirth: dobForAge(16),
  },
  {
    key:         "guardian",
    email:       "guardian@famtree.test",
    firstName:   "Gale",
    lastName:    "Guardian",
    role:        "member",
    dateOfBirth: dobForAge(38),
  },
  {
    key:         "trustedAdult",
    email:       "trusted-adult@famtree.test",
    firstName:   "Tracy",
    lastName:    "Trusted",
    role:        "member",
    dateOfBirth: dobForAge(45),
  },
  {
    key:         "ceo",
    email:       "ceo@famtree.test",
    firstName:   "Chris",
    lastName:    "Chief",
    role:        "member",
    dateOfBirth: dobForAge(48),
  },
  {
    key:         "cfo",
    email:       "cfo@famtree.test",
    firstName:   "Fin",
    lastName:    "Officer",
    role:        "member",
    dateOfBirth: dobForAge(44),
  },
  {
    key:         "employee",
    email:       "employee@famtree.test",
    firstName:   "Em",
    lastName:    "Ployee",
    role:        "member",
    dateOfBirth: dobForAge(28),
  },
  {
    key:         "peer",
    email:       "peer@famtree.test",
    firstName:   "Parker",
    lastName:    "Peer",
    role:        "member",
    dateOfBirth: dobForAge(32),
  },
  {
    key:         "unknownDob",
    email:       "unknown-dob@famtree.test",
    firstName:   "Alex",
    lastName:    "Unknown",
    role:        "member",
    dateOfBirth: null,
  },
];

const FAMILY_UNIT_NAME = "Scenario Family (Agent 66)";
const FAMILY_TRUST_NAME = "Scenario Family Circle";
const BUSINESS_TRUST_NAME = "Scenario Executive Team";
const PEER_TRUST_NAME = "Scenario Peer Pod";

// ─── Guards ────────────────────────────────────────────────────────────────────

function assertSafeEnvironment() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_AIHSAFE_SCENARIO_SEED !== "1") {
    console.error(
      "\n❌ Refused: NODE_ENV=production. Set ALLOW_AIHSAFE_SCENARIO_SEED=1 only on an approved dev/staging DB.\n",
    );
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("\n❌ DATABASE_URL is required.\n");
    process.exit(1);
  }
}

// ─── Plan types ────────────────────────────────────────────────────────────────

type PlannedAction = { kind: string; detail: string };

function tierLabel(dob: Date | null): string {
  return deriveAgeTier(dob);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  assertSafeEnvironment();

  console.log(`\n🧪 Family Safe — Relationship Scenario Seed${APPLY ? " (APPLY)" : " (DRY RUN)"}`);
  console.log("─".repeat(64));

  const planned: PlannedAction[] = [];
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);

  for (const def of USER_DEFS) {
    planned.push({
      kind: "user",
      detail: `${def.email} (${def.role}, age tier ${tierLabel(def.dateOfBirth)})`,
    });
  }

  planned.push({ kind: "founder_settings", detail: "Upsert AihFounderSettings id=singleton (trusted adults on)" });
  planned.push({ kind: "guardian_link", detail: "founder-parent → child (parent, approver)" });
  planned.push({ kind: "guardian_link", detail: "founder-parent → teen (parent, approver)" });
  planned.push({ kind: "guardian_link", detail: "founder-parent → trusted-adult (trusted_adult, approver)" });
  planned.push({ kind: "guardian_link", detail: "guardian@famtree.test → child (legal_guardian, approver)" });
  planned.push({ kind: "family_unit", detail: `${FAMILY_UNIT_NAME} — steward + child + teen` });
  planned.push({ kind: "trust_unit", detail: `${FAMILY_TRUST_NAME} (FAMILY) — founder, child, teen` });
  planned.push({ kind: "trust_unit", detail: `${BUSINESS_TRUST_NAME} (BUSINESS) — ceo, cfo, employee` });
  planned.push({ kind: "trust_unit", detail: `${PEER_TRUST_NAME} (peer) — founder, guardian, peer` });
  planned.push({ kind: "policy", detail: "ensurePolicyProfile() per scenario user" });

  console.log("\nPlanned actions:\n");
  for (const p of planned) {
    console.log(`  [${p.kind}] ${p.detail}`);
  }

  if (!APPLY) {
    printLoginNotes(null);
    console.log("\nDry run complete. Re-run with --apply to write to the database.\n");
    return;
  }

  const ids: Record<string, string> = {};

  for (const def of USER_DEFS) {
    const user = await prisma.user.upsert({
      where:  { email: def.email },
      create: {
        email:         def.email,
        passwordHash,
        firstName:     def.firstName,
        lastName:      def.lastName,
        role:          def.role,
        status:        "active",
        emailVerified: true,
        dateOfBirth:   def.dateOfBirth,
      },
      update: {
        firstName:   def.firstName,
        lastName:    def.lastName,
        role:        def.role,
        status:      "active",
        dateOfBirth: def.dateOfBirth,
        passwordHash,
      },
    });
    ids[def.key] = user.id;
    console.log(`  ✅ user ${def.email}`);
  }

  // Tree placement under steward
  await prisma.user.update({
    where: { id: ids.child },
    data:  { invitedById: ids.founderParent },
  });
  await prisma.user.update({
    where: { id: ids.teen },
    data:  { invitedById: ids.founderParent },
  });

  await prisma.aihFounderSettings.upsert({
    where:  { id: "singleton" },
    create: {
      id:                               "singleton",
      founderUserId:                    ids.founderParent,
      requireGuardianApprovalForMinors: true,
      allowMinorInvites:                false,
      allowMinorPosting:                true,
      allowMinorExternalLinks:          false,
      defaultVisibilityScope:           "family",
      enableTrustedAdults:              true,
      enablePrivateThreads:             true,
    },
    update: {
      founderUserId:       ids.founderParent,
      enableTrustedAdults: true,
    },
  });
  console.log("  ✅ founder settings (singleton)");

  async function upsertGuardianLink(
    guardianUserId: string,
    childUserId: string,
    kind: "parent" | "grandparent" | "legal_guardian" | "trusted_adult",
    permissionLevel: "view_only" | "approver" | "full_control",
  ) {
    await prisma.aihGuardianRelationship.upsert({
      where: {
        guardianUserId_childUserId: { guardianUserId, childUserId },
      },
      create: { guardianUserId, childUserId, kind, permissionLevel },
      update: { kind, permissionLevel, revokedAt: null },
    });
  }

  await upsertGuardianLink(ids.founderParent, ids.child, "parent", "approver");
  await upsertGuardianLink(ids.founderParent, ids.teen, "parent", "approver");
  await upsertGuardianLink(ids.founderParent, ids.trustedAdult, "trusted_adult", "approver");
  await upsertGuardianLink(ids.guardian, ids.child, "legal_guardian", "approver");
  console.log("  ✅ guardian links");

  // Family unit
  let familyUnit = await prisma.aihFamilyUnit.findFirst({
    where: { name: FAMILY_UNIT_NAME, status: "active" },
  });
  if (!familyUnit) {
    familyUnit = await prisma.aihFamilyUnit.create({
      data: {
        name:            FAMILY_UNIT_NAME,
        createdByUserId: ids.founderParent,
        members: {
          create: [
            { userId: ids.founderParent, role: "guardian" },
            { userId: ids.child, role: "child" },
            { userId: ids.teen, role: "child" },
          ],
        },
      },
    });
  } else {
    const memberSpecs = [
      { userId: ids.founderParent, role: "guardian" as const },
      { userId: ids.child, role: "child" as const },
      { userId: ids.teen, role: "child" as const },
    ];
    for (const m of memberSpecs) {
      await prisma.aihFamilyUnitMember.upsert({
        where: {
          familyUnitId_userId: { familyUnitId: familyUnit.id, userId: m.userId },
        },
        create: { familyUnitId: familyUnit.id, userId: m.userId, role: m.role },
        update: { role: m.role, exitedAt: null },
      });
    }
  }
  console.log(`  ✅ family unit ${familyUnit.id}`);

  async function ensureTrustUnit(
    name: string,
    meta: {
      kind: "family" | "peer" | "extended" | "guardian";
      vaultSpaceType: "FAMILY" | "BUSINESS" | "CHURCH" | "CLUB" | "PRIVATE" | "CUSTOM";
      maxMemberCount?: number;
    },
    memberUserIds: string[],
  ) {
    const existing = await prisma.trustUnit.findFirst({
      where: { aihMeta: { name } },
      include: { members: true, aihMeta: true },
    });

    if (existing) {
      for (const uid of memberUserIds) {
        const has = existing.members.some((m) => m.userId === uid);
        if (!has) {
          await prisma.trustUnitMember.create({
            data: { trustUnitId: existing.id, userId: uid },
          });
        }
      }
      return existing.id;
    }

    const tu = await prisma.trustUnit.create({
      data: {
        members: {
          create: memberUserIds.map((userId) => ({ userId })),
        },
        aihMeta: {
          create: {
            kind:              meta.kind,
            vaultSpaceType:    meta.vaultSpaceType,
            name,
            defaultVisibilityScope: "trust_unit",
            maxMemberCount:    meta.maxMemberCount ?? Math.max(10, memberUserIds.length + 2),
          },
        },
      },
    });
    return tu.id;
  }

  await ensureTrustUnit(
    FAMILY_TRUST_NAME,
    { kind: "family", vaultSpaceType: "FAMILY", maxMemberCount: 12 },
    [ids.founderParent, ids.child, ids.teen],
  );
  await ensureTrustUnit(
    BUSINESS_TRUST_NAME,
    { kind: "extended", vaultSpaceType: "BUSINESS", maxMemberCount: 12 },
    [ids.ceo, ids.cfo, ids.employee],
  );
  await ensureTrustUnit(
    PEER_TRUST_NAME,
    { kind: "peer", vaultSpaceType: "CLUB", maxMemberCount: 10 },
    [ids.founderParent, ids.guardian, ids.peer],
  );
  console.log("  ✅ trust units");

  for (const def of USER_DEFS) {
    await ensurePolicyProfile(ids[def.key], def.dateOfBirth);
    const tier = deriveAgeTier(def.dateOfBirth);
    console.log(`  ✅ policy ${def.email} (${tier})`);
  }

  printLoginNotes(ids);
  console.log("\n✅ Scenario seed applied.\n");
}

function printLoginNotes(ids: Record<string, string> | null) {
  console.log("\n" + "─".repeat(64));
  console.log("Test logins (dev only — same password for all scenario accounts):\n");
  console.log(`  Password: ${TEST_PASSWORD}\n`);

  const rows = [
    { email: "founder-parent@famtree.test", note: "Family steward · /aihsafe full tabs" },
    { email: "child@famtree.test",          note: "Child tier · Family Safe: Spaces + Activity only" },
    { email: "teen@famtree.test",           note: "Teen tier (minor) · same shell as child" },
    { email: "guardian@famtree.test",       note: "Second guardian on child · Approvals inbox" },
    { email: "trusted-adult@famtree.test",  note: "Trusted-adult link from steward" },
    { email: "ceo@famtree.test",            note: "Business trust unit lead" },
    { email: "cfo@famtree.test",            note: "Business trust unit" },
    { email: "employee@famtree.test",       note: "Business trust unit" },
    { email: "peer@famtree.test",           note: "Peer pod with founder + guardian" },
    { email: "unknown-dob@famtree.test",    note: "No DOB — conservative policy (UNKNOWN tier)" },
  ];

  for (const r of rows) {
    console.log(`  ${r.email}`);
    console.log(`    ${r.note}`);
    if (ids) {
      const def = USER_DEFS.find((d) => d.email === r.email);
      if (def?.key && ids[def.key]) console.log(`    userId=${ids[def.key]}`);
    }
  }

  console.log("\n  Also available: founder@famtree.test / password123 (db:seed) if present.");
  console.log("  No auth bypass — sign in at /login with the emails above.\n");
  console.log("  Suggested manual paths:");
  console.log("    /aihsafe → Members — guardian + trusted adult links");
  console.log("    /aihsafe → Spaces — family / business / peer circles");
  console.log("    /msg-vault — governed chats within trust units");
  console.log("    /dashboard — daily feed (separate from Family Safe activity)\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
