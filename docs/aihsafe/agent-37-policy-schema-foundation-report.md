# Agent 37 — Policy Schema Foundation Report

**Date:** 2026-05-11  
**Branch:** aihsafe-agent-37-policy-schema-foundation

---

## 1. Files Created

| File | Purpose |
|---|---|
| `types/aihsafe/policy.ts` | All policy type contracts: sub-policy shapes, `PolicySourceType`, `ResolvedPolicyProfile`, `FounderSettingsData`, `ChildPolicyProjection` |
| `lib/aihsafe/policy/defaults.ts` | Pure factory: `buildDefaultPolicyProfile(userId, ageTier, founderSettings)` |
| `lib/aihsafe/policy/resolvePolicyProfile.ts` | DB-connected: `resolvePolicyProfile(userId)`, `createDefaultPolicyProfileRow()` |
| `lib/aihsafe/policy/projectChildPolicy.ts` | Pure: `projectChildPolicy(profile, pendingApprovals)` → `ChildPolicyProjection` |
| `lib/aihsafe/policy/index.ts` | Barrel export for the policy layer |
| `docs/aihsafe/agent-37-policy-schema-foundation-report.md` | This document |
| `docs/aihsafe/policy-resolution-flow.md` | Narrative flow diagram |

## 2. Files Modified

| File | Change |
|---|---|
| `prisma/schema.prisma` | Added `AihFounderSettings` model, `AihPolicyProfile` model, `User.aihPolicyProfile` back-relation |
| `types/aihsafe/index.ts` | Added `export * from "./policy"` |
| `lib/aihsafe/index.ts` | Added `export * from "./policy"` |
| `lib/aihsafe/governance/index.ts` | Added TODO comment at UNKNOWN tier fallthrough in `isScopePermittedFor` (no behavioral change) |

## 3. Schema Additions

### `aih_founder_settings` (new)

Singleton governance table. Application uses `findFirst()` / upsert pattern.

| Column | Type | Default | Purpose |
|---|---|---|---|
| id | String (cuid) | auto | PK |
| founderUserId | String? | null | Audit only — who last saved (no FK) |
| requireGuardianApprovalForMinors | Boolean | true | Master gate: routes all minor actions to guardian approval |
| allowMinorInvites | Boolean | false | Whether children/teens may send invites at all |
| allowMinorPosting | Boolean | true | Whether children/teens may create posts |
| allowMinorExternalLinks | Boolean | false | Whether minors may include external URLs |
| defaultVisibilityScope | String | "family" | Default scope for adult member content |
| enableTrustedAdults | Boolean | true | Whether `trusted_adult` guardian kind is active |
| enablePrivateThreads | Boolean | true | Whether TRUST_UNIT scope spaces are permitted |
| createdAt | DateTime | now() | |
| updatedAt | DateTime | auto | |

### `aih_policy_profiles` (new)

Per-user policy snapshot. JSON blobs store per-field overrides; null = use defaults.

| Column | Type | Default | Purpose |
|---|---|---|---|
| id | String (cuid) | auto | PK |
| userId | String | — | @unique FK → users |
| ageTierSnapshot | String | — | AgeTier at last resolution |
| sourceType | String | "system_default" | PolicySourceType provenance |
| postingPolicy | Json? | null | PostingPolicy override blob |
| invitePolicy | Json? | null | InvitePolicy override blob |
| visibilityPolicy | Json? | null | VisibilityPolicy override blob |
| escalationPolicy | Json? | null | EscalationPolicy override blob |
| interestsPolicy | Json? | null | InterestsPolicy blob (Agent 40) |
| limitsPolicy | Json? | null | LimitsPolicy blob (Agent 41) |
| createdAt | DateTime | now() | |
| updatedAt | DateTime | auto | |

## 4. Policy Resolution Flow

```
resolvePolicyProfile(userId)
  │
  ├─ 1. prisma.user.findUnique → dateOfBirth
  │       └─ deriveAgeTier(dateOfBirth) → AgeTier
  │
  ├─ 2. prisma.aihFounderSettings.findFirst → FounderSettingsData | null
  │
  ├─ 3. buildDefaultPolicyProfile(userId, ageTier, founderSettings)
  │       └─ per-tier factories: postingDefaults, inviteDefaults,
  │          visibilityDefaults, interestsDefaults, limitsDefaults,
  │          escalationDefaults
  │       → ResolvedPolicyProfile (baseline)
  │
  ├─ 4. prisma.aihPolicyProfile.findUnique → stored JSON blobs
  │
  └─ 5. mergeSubPolicy(baseline.posting, stored.postingPolicy)
         mergeSubPolicy(baseline.invite, stored.invitePolicy)
         ...per sub-policy...
         → ResolvedPolicyProfile (final, merged)
```

**Precedence (highest wins):** stored per-user override > founder default > system default

## 5. UNKNOWN Age Tier Handling Changes

### Before (governance kernel — unchanged)
`isScopePermittedFor()` returns `true` for UNKNOWN, effectively granting adult-level scope access.

### After (policy layer — new)
`buildDefaultPolicyProfile()` assigns UNKNOWN tier conservative defaults:

| Policy | UNKNOWN value | Rationale |
|---|---|---|
| `posting.allowedScopes` | `TEEN_ALLOWED_SCOPES` | No PUBLIC_APPROVED or EXTENDED_TRUST |
| `posting.dailyLimit` | 20 | Same as TEEN |
| `posting.maxBodyLength` | 1000 | Same as TEEN |
| `invite.allowed` | `false` | No invites until age verified |
| `visibility.defaultScope` | `FAMILY` | Conservative |
| `visibility.maxScope` | `TRUST_UNIT` | No extended or public |
| `visibility.profileDiscoverable` | `false` | Not discoverable |
| `limits.dailyPostLimit` | 20 | Same as TEEN |
| `limits.dailyInviteLimit` | 0 | No invites |

### Remaining unsafe path (documented for Agent 38)
The governance kernel `isScopePermittedFor()` still falls through `return true` for UNKNOWN. Until API routes thread `resolvePolicyProfile()` and check `policy.visibility.allowedScopes` before the kernel call, an UNKNOWN user who reaches `canPostContent()` will NOT be scope-limited by the kernel alone.

**Agent 38 fix:** Wire `resolvePolicyProfile()` into API routes that call `canPostContent()` / `canInviteToTrustUnit()`. The route should compare the requested scope against `policy.visibility.allowedScopes` before forwarding to the kernel.

## 6. Founder Override Model

`AihFounderSettings` provides 7 boolean/string fields that the `buildDefaultPolicyProfile()` factory consults when `founderSettings !== null`:

| Founder field | Affects |
|---|---|
| `requireGuardianApprovalForMinors` | `posting.requiresGuardianApproval`, `escalation.*` for CHILD/PRETEEN/TEEN |
| `allowMinorInvites` | `invite.allowed` for CHILD/PRETEEN/TEEN |
| `allowMinorPosting` | `posting.allowed` for CHILD/PRETEEN/TEEN |
| `defaultVisibilityScope` | `visibility.defaultScope` for ADULT/ELDER |
| `enableTrustedAdults` | No effect in policy defaults (schema-only flag; consumed by future guardian link UI) |
| `enablePrivateThreads` | No effect in policy defaults (schema-only flag; consumed by space creation logic) |

When `founderSettings` is `null` (no row exists), `PolicySourceType.SYSTEM_DEFAULT` is used and all defaults are hardcoded safe values.

## 7. Child Policy Projection Model

`projectChildPolicy(profile, pendingApprovals)` strips `ResolvedPolicyProfile` to:

```typescript
ChildPolicyProjection {
  canPost:              profile.posting.allowed
  canComment:           true  // scope+membership only; not policy-configurable yet
  canInvite:            profile.invite.allowed
  defaultScope:         profile.visibility.defaultScope
  allowedScopes:        profile.visibility.allowedScopes
  postDailyLimit:       profile.limits.dailyPostLimit
  allowedCategoryIds:   profile.interests.allowedCategoryIds   // populated by Agent 40
  pendingApprovalCount: (injected by caller)
}
```

Parent-only fields omitted: `requiresGuardianApproval`, `escalationPolicy`, `sourceType`, `maxScope`, `profileDiscoverable`.

## 8. Remaining Unsafe Paths

| Path | Risk | Owner |
|---|---|---|
| `isScopePermittedFor()` in governance kernel | UNKNOWN tier passes all scope checks | Agent 38 — thread policy into activity/invites API routes |
| Registration route | No `AihPolicyProfile` created on user register | Agent 38 — call `createDefaultPolicyProfileRow()` post-create |
| `AihFounderSettings` row | Does not exist until Agent 39 creates it; `resolvePolicyProfile()` falls back to system defaults | Agent 39 — seed on first founder login |
| `interestsPolicy` blob | Always null; `allowedCategoryIds` always `[]` | Agent 40 |
| `limitsPolicy` blob | Always null; limits not enforced | Agent 41 |
| `AihPolicyProfile.ageTierSnapshot` | Not refreshed on DOB change; stale until next upsert | Agent 38 — refresh on each login |

## 9. Validation Results

| Check | Result |
|---|---|
| `npm run db:push` | ✅ Schema in sync — 2 new tables created |
| `npm run db:generate` | ✅ Prisma client regenerated |
| `npx tsc --noEmit` | ✅ No TypeScript errors |
| `npm run build` | ✅ Build succeeded (dynamic route warnings are pre-existing, not new) |

No existing routes, components, or tests were broken. Zero source files were deleted.
