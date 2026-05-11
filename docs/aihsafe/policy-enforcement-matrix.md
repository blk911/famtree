# AIH Safe — Policy Enforcement Matrix

**Produced by:** Agent 44  
**Branch:** `aihsafe-agent-44-policy-enforcement-qa`

Legend: ✅ enforced · ⚠️ partial · ❌ gap · — not applicable

---

## Founder settings enforcement

| Setting | DB persisted | Policy layer consumes | Route enforces | Gap / notes |
|---|---|---|---|---|
| `requireGuardianApprovalForMinors` | ✅ | ✅ `posting.requiresGuardianApproval`, `escalation.*` in `buildDefaultPolicyProfile` | ⚠️ Activity POST does not escalate CHILD/PRETEEN posts to approval queue | Post-content escalation flow not built; tracked as future work |
| `allowMinorPosting` | ✅ | ✅ `posting.allowed` via `postingDefaults()` | ✅ **Agent 44** activity POST now calls `resolvePolicyProfile` for minor actors and returns 403 when false | — |
| `allowMinorInvites` | ✅ | ✅ `invite.allowed` via `inviteDefaults()` | ⚠️ Governance kernel `canInviteToTrustUnit` hard-denies ALL minor actors regardless of this flag | Kernel is pure and can't read DB — `allowMinorInvites=true` has no route-level effect; requires kernel extension in a future agent |
| `allowMinorExternalLinks` | ✅ | ❌ not consumed by any policy function | ❌ no route checks it | No URL-extraction or external-link detection exists yet; future agent |
| `defaultVisibilityScope` | ✅ | ✅ `visibility.defaultScope` via `visibilityDefaults()` (ADULT/ELDER) | ✅ **Agent 44** activity POST now: for minor actors uses `policy.visibility.defaultScope`; for adults loads founder settings and uses `defaultVisibilityScope` as fallback when no scope supplied | — |
| `enableTrustedAdults` | ✅ | ❌ not consumed by policy layer | ✅ **Agent 44** guardian-links POST now checks this flag; blocks `kind="trusted_adult"` when disabled | — |
| `enablePrivateThreads` | ✅ | ❌ not consumed by policy layer | ❌ no corresponding `TrustUnitKind` exists yet | TrustUnitKind values are `family`, `peer`, `extended`, `guardian` — no "private" or "thread" kind; flag is reserved for a future message-thread feature |

---

## Limits engine enforcement

| Setting | DB persisted | Policy layer | Route enforces |
|---|---|---|---|
| Daily post limit | ✅ `limitsDefaults()` | ✅ | ✅ `checkPostLimits` in activity POST |
| Weekly post limit | ✅ `limitsDefaults()` | ✅ | ✅ `checkPostLimits` rolling 7-day window |
| Daily invite limit | ✅ `limitsDefaults()` | ✅ | ✅ `checkInviteLimits` in invites POST (sums direct + escalated) |
| Daily comment limit | ✅ `limitsDefaults()` | ✅ | ✅ `checkCommentLimits` in comments POST |

---

## UNKNOWN age tier

| Path | Enforced |
|---|---|
| `checkPostLimits` | ✅ UNKNOWN receives TEEN-conservative daily/weekly limits |
| `checkInviteLimits` | ✅ `dailyInviteLimit=0` — blocks immediately |
| `checkCommentLimits` | ✅ TEEN-conservative |
| Governance kernel `isScopePermittedFor` | ✅ Treats UNKNOWN as TEEN (restricted scopes only) |
| `postingDefaults` in policy layer | ✅ UNKNOWN gets TEEN-like defaults |

---

## Interest category allowlist

| Path | Status | Notes |
|---|---|---|
| Founder category toggle | ⚠️ localStorage only | `CategoryAllowlistPanel` writes to `localStorage["aihsafe_founder_allowed_categories"]`; not persisted to DB |
| API enforcement | ❌ none | `POST /api/aihsafe/activity` does not validate `categoryId` against the allowlist |
| Child PostComposer | ⚠️ UI-local | Category chip row renders correctly but selected category is not submitted to the API |
| Schema support | ❌ none | `ActivityPost` has no `categoryId` column; `AihFounderSettings` has no `allowedCategoryIds` column |

Requires schema change (`db:push`) before API enforcement is possible.

---

## Summary of remaining gaps

| Gap | Risk | Path to close |
|---|---|---|
| `requireGuardianApprovalForMinors` → post escalation | Low (currently CHILD/PRETEEN posts go directly to DB with `governanceState=allowed`) | Add `AihApprovalRequest` creation path in activity POST for CHILD/PRETEEN when `escalation.requiresGuardianApprovalForPostContent=true`; set `governanceState=pending` |
| `allowMinorInvites=true` → kernel still blocks | Medium (founder cannot grant invite permission to minors via settings alone) | Extend `canInviteToTrustUnit` to accept a `policyAllowed` flag from the resolved profile, or add a policy pre-check before the kernel call |
| `allowMinorExternalLinks` | Low (no URL extraction built) | Add URL regex scan in activity POST body parser; 403 if external URL detected for minor actors with `allowMinorExternalLinks=false` |
| `enablePrivateThreads` | Low (no matching TrustUnitKind) | Define a `PRIVATE` kind in `TrustUnitKind`; block creation in trust-units POST when flag is false |
| Category allowlist API enforcement | Low (UI-only enforcement so far) | Add `categoryId` to `ActivityPost` schema + `CreatePostSchema`; validate against founder allowlist in activity POST |
