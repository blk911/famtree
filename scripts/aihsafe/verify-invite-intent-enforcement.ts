/**
 * Agent 74 — invite intent / founder relationship enforcement QA.
 * Usage: npx tsx scripts/aihsafe/verify-invite-intent-enforcement.ts
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { prisma } from "@/lib/db/prisma";
import type { Invite } from "@prisma/client";
import { deriveShellMode } from "@/components/aihsafe/roles/shellMode";
import {
  canEditFamilyGovernance,
  settingsTabLabel,
} from "@/components/aihsafe/roles/governanceView";
import { deriveAgeTier } from "@/lib/aihsafe/governance";
import { AgeTier, isMinorTier } from "@/types/aihsafe/age-tiers";
import { InviteIntent } from "@/types/aihsafe/invite-intent";
import { resolveInviteIntentFromRow } from "@/lib/aihsafe/invites/invite-fields";
import {
  shouldResolveTrustUnitPendingOnRegister,
  roleForInviteRegistration,
  validateInviteAgeBracketMatchesTier,
  validateTrustedAdultInviteeAge,
  validateBusinessInviteShape,
} from "@/lib/aihsafe/invites/inviteRegisterPolicy";
import { validateInviteIntentRouting } from "@/lib/aihsafe/invites/routeByIntent";
import { validateRegistrationAgainstInvite } from "@/lib/aihsafe/invites/validateRegisterInvite";
import { resolvePolicyProfile } from "@/lib/aihsafe/policy";

type Result = { id: string; pass: boolean; detail: string };
const results: Result[] = [];

function record(id: string, pass: boolean, detail: string) {
  results.push({ id, pass, detail });
}

function mockInvite(partial: Partial<Invite>): Invite {
  return {
    id:                 "test-invite",
    token:              "00000000-0000-0000-0000-000000000001",
    senderId:           "sender-1",
    recipientEmail:     "test@famtree.test",
    status:             "ACCEPTED",
    attempts:           0,
    maxAttempts:        3,
    relationship:       "frnd",
    inviteIntent:       null,
    relationshipKind:   null,
    inviteeAgeBracket:  null,
    stewardDeclaration: false,
    sponsorUserId:      null,
    stewardUserId:        null,
    targetTrustUnitId:    null,
    targetFamilyUnitId:   null,
    expiresAt:          new Date(Date.now() + 86_400_000),
    acceptedAt:         new Date(),
    createdAt:          new Date(),
    ...partial,
  };
}

function expectThrow(fn: () => void, code?: string): boolean {
  try {
    fn();
    return false;
  } catch (e) {
    if (code && e instanceof Error && "code" in e && (e as { code: string }).code !== code) {
      return false;
    }
    return true;
  }
}

async function main() {
  console.log("\n🔎 Agent 74 — Invite Intent / Founder Relationship Enforcement\n");

  // ── Pure policy ─────────────────────────────────────────────────────────────
  record(
    "policy.adultFriend.tuPending",
    shouldResolveTrustUnitPendingOnRegister(InviteIntent.ADULT_FRIEND),
    "sponsor invites may resolve TU slots",
  );
  record(
    "policy.child.tuPending.skip",
    !shouldResolveTrustUnitPendingOnRegister(InviteIntent.CHILD),
    "child invites skip TU pending",
  );
  record(
    "policy.business.tuPending.skip",
    !shouldResolveTrustUnitPendingOnRegister(InviteIntent.BUSINESS_MEMBER),
    "business invites skip TU pending",
  );
  record(
    "policy.role.invite",
    roleForInviteRegistration(false) === "member",
    "invitee is member not founder",
  );

  const adultFriendInvite = mockInvite({
    inviteIntent: InviteIntent.ADULT_FRIEND,
    relationship: "frnd",
  });
  record(
    "intent.adultFriend.resolve",
    resolveInviteIntentFromRow(adultFriendInvite) === InviteIntent.ADULT_FRIEND,
    resolveInviteIntentFromRow(adultFriendInvite),
  );

  const childInvite = mockInvite({
    inviteIntent:       InviteIntent.CHILD,
    inviteeAgeBracket:  "child",
    stewardDeclaration: true,
    stewardUserId:      "sender-1",
    relationship:       "child",
  });
  record(
    "intent.child.requiresSteward",
    childInvite.stewardDeclaration === true,
    String(childInvite.stewardDeclaration),
  );

  const childDob = new Date("2014-06-01");
  const childTierCheck = validateInviteAgeBracketMatchesTier(childInvite, childDob);
  record(
    "intent.child.dobMatch",
    childTierCheck.ok,
    childTierCheck.ok ? deriveAgeTier(childDob) : (childTierCheck as { message: string }).message,
  );

  const teenInvite = mockInvite({
    inviteIntent:       InviteIntent.TEEN,
    inviteeAgeBracket:  "teen",
    stewardDeclaration: true,
    relationship:       "child",
  });
  const teenDob = new Date("2009-03-15");
  record(
    "intent.teen.dobMatch",
    validateInviteAgeBracketMatchesTier(teenInvite, teenDob).ok,
    deriveAgeTier(teenDob),
  );

  record(
    "intent.child.teenMismatch",
    !validateInviteAgeBracketMatchesTier(childInvite, teenDob).ok,
    "child invite + teen DOB rejected",
  );

  const businessInvite = mockInvite({
    inviteIntent:       InviteIntent.BUSINESS_MEMBER,
    stewardDeclaration: false,
    targetTrustUnitId:  "tu-1",
  });
  record(
    "intent.business.shape",
    validateBusinessInviteShape(businessInvite).ok,
    "ok",
  );
  record(
    "intent.business.noSteward",
    !validateBusinessInviteShape(
      mockInvite({ inviteIntent: InviteIntent.BUSINESS_MEMBER, stewardDeclaration: true }),
    ).ok,
    "steward on business rejected",
  );

  const trustedInvite = mockInvite({ inviteIntent: InviteIntent.TRUSTED_ADULT });
  record(
    "intent.trustedAdult.adultDob",
    validateTrustedAdultInviteeAge(trustedInvite, new Date("1990-01-01")).ok,
    "ok",
  );
  record(
    "intent.trustedAdult.minorRejected",
    !validateTrustedAdultInviteeAge(trustedInvite, new Date("2015-01-01")).ok,
    "minor DOB rejected",
  );

  // Route validation
  record(
    "route.child.noSteward",
    expectThrow(() =>
      validateInviteIntentRouting(
        {
          sender:              { id: "s" } as never,
          recipientEmail:      "a@b.c",
          inviteIntent:        InviteIntent.CHILD,
          stewardDeclaration:  false,
        },
        InviteIntent.CHILD,
      ),
    ),
    "STEWARD_DECLARATION_REQUIRED",
  );

  record(
    "route.business.stewardBlocked",
    expectThrow(() =>
      validateInviteIntentRouting(
        {
          sender:              { id: "s" } as never,
          recipientEmail:      "a@b.c",
          inviteIntent:        InviteIntent.BUSINESS_MEMBER,
          stewardDeclaration:  true,
        },
        InviteIntent.BUSINESS_MEMBER,
      ),
    ),
    "BUSINESS_STEWARD_NOT_ALLOWED",
  );

  // Register validation
  record(
    "register.child.noDob",
    expectThrow(() => validateRegistrationAgainstInvite(childInvite, null)),
    "DOB_REQUIRED",
  );
  record(
    "register.child.ok",
    (() => {
      try {
        validateRegistrationAgainstInvite(childInvite, childDob);
        return true;
      } catch {
        return false;
      }
    })(),
    "valid child registration",
  );

  // Shell / governance UI policy
  record(
    "shell.child",
    deriveShellMode({ role: "member", dateOfBirth: childDob }) === "child",
    deriveShellMode({ role: "member", dateOfBirth: childDob }),
  );
  record(
    "shell.adultFriend",
    deriveShellMode({ role: "member", dateOfBirth: new Date("1985-01-01") }) === "member",
    "member not founder shell",
  );
  record(
    "shell.founder.notFromMemberRole",
    !canEditFamilyGovernance("member", "member"),
    "adult friend cannot edit Msg Rules",
  );
  record(
    "shell.child.boundariesLabel",
    settingsTabLabel("child") === "Boundaries",
    settingsTabLabel("child"),
  );
  record(
    "shell.founder.msgRulesLabel",
    settingsTabLabel("founder") === "Msg Rules",
    settingsTabLabel("founder"),
  );

  // ── DB spot checks (seed) ───────────────────────────────────────────────────
  const founder = await prisma.user.findUnique({
    where:  { email: "founder-parent@famtree.test" },
    select: { id: true, role: true, dateOfBirth: true },
  });
  const childUser = await prisma.user.findUnique({
    where:  { email: "child@famtree.test" },
    select: { id: true, role: true, dateOfBirth: true },
  });
  const teenUser = await prisma.user.findUnique({
    where:  { email: "teen@famtree.test" },
    select: { id: true, role: true, dateOfBirth: true },
  });
  const peer = await prisma.user.findUnique({
    where:  { email: "peer@famtree.test" },
    select: { id: true, role: true, dateOfBirth: true },
  });

  if (childUser && founder) {
    const link = await prisma.aihGuardianRelationship.findFirst({
      where: {
        guardianUserId: founder.id,
        childUserId:    childUser.id,
        revokedAt:      null,
      },
    });
    record("db.child.guardianLink", link != null, link?.kind ?? "missing");
    record("db.child.role", childUser.role === "member", childUser.role);
    const profile = await resolvePolicyProfile(childUser.id);
    record(
      "db.child.policyMinor",
      isMinorTier(profile.ageTierSnapshot),
      profile.ageTierSnapshot,
    );
    record(
      "db.child.postingGuarded",
      profile.posting.requiresGuardianApproval === true || !profile.posting.allowed,
      `allowed=${profile.posting.allowed} approval=${profile.posting.requiresGuardianApproval}`,
    );
  } else {
    record("db.child", false, "run seed:aihsafe-scenarios:apply");
  }

  if (teenUser) {
    record(
      "db.teen.shell",
      deriveShellMode(teenUser) === "child",
      deriveShellMode(teenUser),
    );
    record("db.teen.tier", deriveAgeTier(teenUser.dateOfBirth) === AgeTier.TEEN, deriveAgeTier(teenUser.dateOfBirth));
  }

  if (peer) {
    record("db.peer.role", peer.role === "member", peer.role);
    record(
      "db.peer.noFounderShell",
      deriveShellMode(peer) !== "founder" || peer.role === "founder",
      deriveShellMode(peer),
    );
    const asGuardian = await prisma.aihGuardianRelationship.findFirst({
      where: { childUserId: peer.id, revokedAt: null },
    });
    record("db.peer.notGuardianChild", asGuardian == null, asGuardian ? "unexpected link" : "no child link");
  }

  if (founder) {
    record(
      "db.steward.canEdit",
      canEditFamilyGovernance("founder", founder.role),
      String(canEditFamilyGovernance("founder", founder.role)),
    );
  }

  const failed = results.filter((r) => !r.pass);
  for (const r of results) {
    console.log(`  ${r.pass ? "✅" : "❌"} ${r.id}`);
    if (!r.pass) console.log(`     ${r.detail}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.\n`);
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
