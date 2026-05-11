# Policy Resolution Flow

This document describes how `resolvePolicyProfile(userId)` produces a
`ResolvedPolicyProfile` from raw DB state on every call.

---

## High-level sequence

```
caller (API route or RSC)
  │
  └─► resolvePolicyProfile(userId)                [lib/aihsafe/policy/resolvePolicyProfile.ts]
        │
        ├─ 1. prisma.user.findUnique({ id: userId })
        │       → dateOfBirth: Date | null
        │       └─ deriveAgeTier(dateOfBirth)     [lib/aihsafe/governance/index.ts]
        │             → AgeTier (CHILD | PRETEEN | TEEN | ADULT | ELDER | UNKNOWN)
        │
        ├─ 2. prisma.aihFounderSettings.findFirst()
        │       → FounderSettingsData | null
        │       (null when no row exists — system-default mode)
        │
        ├─ 3. buildDefaultPolicyProfile(userId, ageTier, founderSettings)
        │       [lib/aihsafe/policy/defaults.ts]
        │       │
        │       ├─ per-tier posting defaults  ─────┐
        │       ├─ per-tier invite defaults         │  all pure, no I/O
        │       ├─ per-tier visibility defaults     │
        │       ├─ per-tier interests defaults      │
        │       ├─ per-tier limits defaults         │
        │       └─ per-tier escalation defaults  ───┘
        │       → ResolvedPolicyProfile  (baseline)
        │
        ├─ 4. prisma.aihPolicyProfile.findUnique({ userId })
        │       → stored row with JSON blobs | null
        │
        └─ 5. mergeSubPolicy<T>(baseline.X, stored.Xpolicy)  × 6 sub-policies
                → ResolvedPolicyProfile  (final, returned to caller)
```

---

## Merge precedence

Highest wins — later layers can only tighten or loosen, never silently drop:

```
stored per-user override   ← set by guardian or founder actions (Agent 39+)
      ↑
founder default            ← AihFounderSettings row (Agent 39 seeds this)
      ↑
system default             ← hardcoded safe values in defaults.ts
```

`mergeSubPolicy<T>` is a shallow object spread:
```typescript
{ ...baseline, ...(stored as Partial<T>) }
```

Any field present in the stored blob replaces the baseline value.
Any field absent from the blob inherits the baseline.

---

## AgeTier → policy tier mapping

| AgeTier | Posting | Invites | Visibility | Notes |
|---|---|---|---|---|
| CHILD | blocked | blocked | FAMILY only | Guardian approval required for everything |
| PRETEEN | blocked | blocked | FAMILY only | Same as CHILD |
| TEEN | allowed (family/trust_unit) | blocked by default | FAMILY or TRUST_UNIT | Founder can enable invites |
| ADULT | allowed (all non-PUBLIC_APPROVED) | allowed | Up to EXTENDED_TRUST | Default site mode |
| ELDER | same as ADULT | allowed | same as ADULT | |
| UNKNOWN | TEEN-conservative | blocked | FAMILY or TRUST_UNIT | Not public-discoverable; age must be verified |

`UNKNOWN` is conservative because `dateOfBirth` is null. The governance kernel
currently still passes UNKNOWN through `isScopePermittedFor()` — that gap is
tracked for Agent 38.

---

## FounderSettingsData influence

When `founderSettings !== null`, `buildDefaultPolicyProfile` reads:

| Founder field | Sub-policy affected | Tiers affected |
|---|---|---|
| `requireGuardianApprovalForMinors` | `posting.requiresGuardianApproval`, `escalation.*` | CHILD, PRETEEN, TEEN |
| `allowMinorInvites` | `invite.allowed` | CHILD, PRETEEN, TEEN |
| `allowMinorPosting` | `posting.allowed` | CHILD, PRETEEN, TEEN |
| `allowMinorExternalLinks` | (no effect yet — Agent 41) | — |
| `defaultVisibilityScope` | `visibility.defaultScope` | ADULT, ELDER |
| `enableTrustedAdults` | (schema flag only — Agent 39 UI) | — |
| `enablePrivateThreads` | (schema flag only — space creation) | — |

When `founderSettings` is `null`, `sourceType = PolicySourceType.SYSTEM_DEFAULT`
and all values use hardcoded safe defaults.

---

## Child policy projection

For rendering a child's own UI, strip the full profile to a safe subset:

```
projectChildPolicy(profile, pendingApprovals)
  [lib/aihsafe/policy/projectChildPolicy.ts]
  │
  └─ ChildPolicyProjection {
       canPost:             profile.posting.allowed
       canComment:          true  (not policy-gated yet)
       canInvite:           profile.invite.allowed
       defaultScope:        profile.visibility.defaultScope
       allowedScopes:       profile.visibility.allowedScopes
       postDailyLimit:      profile.limits.dailyPostLimit
       allowedCategoryIds:  profile.interests.allowedCategoryIds
       pendingApprovalCount: (injected by caller)
     }
```

Parent-facing fields (`requiresGuardianApproval`, `escalationPolicy`,
`sourceType`, `maxScope`, `profileDiscoverable`) are intentionally excluded
from `ChildPolicyProjection`.

---

## Remaining unsafe paths

| Path | Risk | Assigned to |
|---|---|---|
| `isScopePermittedFor()` kernel | UNKNOWN passes all scope checks | Agent 38 |
| Registration route | No `AihPolicyProfile` row created on register | Agent 38 |
| `ageTierSnapshot` staleness | Not refreshed on DOB change | Agent 38 |
| `interestsPolicy` blob | Always null → `allowedCategoryIds: []` | Agent 40 |
| `limitsPolicy` blob | Always null → limits not enforced | Agent 41 |
| `AihFounderSettings` row | Does not exist until Agent 39 seeds it | Agent 39 |
