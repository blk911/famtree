# Agent 44 — Policy Enforcement Wiring QA

**Branch:** `aihsafe-agent-44-policy-enforcement-qa`  
**Status:** Complete

---

## 1. Files Inspected

| File | Purpose |
|---|---|
| `docs/aihsafe/agent-39-founder-settings-report.md` | Persisted settings map |
| `docs/aihsafe/agent-40-child-interests-report.md` | Category allowlist architecture |
| `docs/aihsafe/agent-41-limits-engine-report.md` | Limits engine design |
| `docs/aihsafe/agent-42-invite-services-report.md` | Invite service lifecycle |
| `docs/aihsafe/policy-resolution-flow.md` | resolvePolicyProfile sequence |
| `docs/aihsafe/founder-settings-flow.md` | FounderSettings enforcement map |
| `docs/aihsafe/interests-category-policy.md` | Category system design |
| `lib/aihsafe/policy/defaults.ts` | Sub-policy builders per tier |
| `lib/aihsafe/policy/resolvePolicyProfile.ts` | Merge + resolution logic |
| `lib/aihsafe/governance/index.ts` | Pure kernel functions |
| `app/api/aihsafe/activity/route.ts` | Post create/list route |
| `app/api/aihsafe/activity/[postId]/comments/route.ts` | Comment route |
| `app/api/aihsafe/invites/route.ts` | Invite route |
| `app/api/aihsafe/approvals/route.ts` | Guardian approval route |
| `app/api/aihsafe/trust-units/route.ts` | Trust unit create/list |
| `app/api/aihsafe/guardian-links/route.ts` | Guardian relationship route |
| `app/api/aihsafe/founder-settings/route.ts` | Settings GET/PATCH |
| `types/aihsafe/policy.ts` | ResolvedPolicyProfile contracts |
| `types/aihsafe/age-tiers.ts` | AgeTier definitions + isMinorTier |
| `types/aihsafe/trust-units.ts` | TrustUnitKind values |

---

## 2. Files Modified

| File | Change |
|---|---|
| `app/api/aihsafe/activity/route.ts` | Enforce `allowMinorPosting`; honor `defaultVisibilityScope` |
| `app/api/aihsafe/guardian-links/route.ts` | Enforce `enableTrustedAdults` |

---

## 3. Settings Enforced Now (post-Agent 44)

### `allowMinorPosting = false` → activity POST returns 403

**Before:** Activity POST called `canPostContent()` (kernel — scope check only). A minor could post even when the founder had set `allowMinorPosting=false`.

**After:** For any minor actor (`isMinorTier(actor.ageTier)`), the route calls `resolvePolicyProfile(user.id)` and checks `policy.posting.allowed`. If false:
```
HTTP 403 FORBIDDEN
"Posting is currently disabled for your account. Ask your guardian if you have questions."
```

Cost: adds 3 DB queries (user DOB, founder settings, policy profile) only for minor actors. Adult path is unchanged.

---

### `defaultVisibilityScope` → activity POST uses it as fallback

**Before:** When no `visibilityScope` was submitted by the client, the route defaulted to `VisibilityScope.TRUST_UNIT` unconditionally.

**After:**
- **Minor actors:** scope falls back to `policy.visibility.defaultScope` from `resolvePolicyProfile` (already called for the `allowMinorPosting` check — no extra cost).
- **Adult/Elder actors:** when no scope submitted, route does a single `prisma.aihFounderSettings.findFirst({ select: { defaultVisibilityScope: true } })` and uses that value; falls back to `TRUST_UNIT` if no founder settings row exists.

The client can still supply an explicit scope; this only affects the fallback.

---

### `enableTrustedAdults = false` → guardian-links POST blocks `trusted_adult` kind

**Before:** A user could create a guardian link with `kind="trusted_adult"` regardless of founder settings.

**After:** Before creating the link, the route checks:
```ts
if (kind === "trusted_adult") {
  const fs = await prisma.aihFounderSettings.findFirst(...)
  if (fs && !fs.enableTrustedAdults) return forbidden(...)
}
```
Returns 403 if the founder has disabled trusted adult relationships. Cost: 1 DB query only when `kind="trusted_adult"`.

---

## 4. Settings Still Persisted-Only (not yet enforced at route level)

| Setting | Reason |
|---|---|
| `requireGuardianApprovalForMinors` → post escalation | Requires building a new post-escalation flow (create `AihApprovalRequest` for posts; set `governanceState=pending`). Out of scope for a QA patch agent. |
| `allowMinorInvites = true` | Governance kernel hard-denies all minor invite attempts. Kernel is pure (no DB) — cannot read founder settings. Requires a policy pre-check before the kernel call, or a `policyAllowed` flag propagated from the route into the kernel context. |
| `allowMinorExternalLinks` | No URL extraction or scanning exists. Future: regex URL detection in POST body + 403 for minors when disabled. |
| `enablePrivateThreads` | No `PRIVATE` or `THREAD` TrustUnitKind exists. Flag is reserved for a future message-thread feature and cannot be gated without a schema addition. |
| Interest category allowlist | Stored in `localStorage` (not DB). No `categoryId` on `ActivityPost`. Cannot enforce at API level without schema change. |

---

## 5. Route Patches Made

| Route | Patch |
|---|---|
| `POST /api/aihsafe/activity` | Call `resolvePolicyProfile` for minors; block on `posting.allowed=false`; use `defaultVisibilityScope` as scope fallback |
| `POST /api/aihsafe/guardian-links` | Block `trusted_adult` kind when `enableTrustedAdults=false` |

---

## 6. UI Patches Made

None. The mission prohibited new UI builds.

---

## 7. Remaining Gaps (by priority)

| Priority | Gap | Suggested agent scope |
|---|---|---|
| P1 | `requireGuardianApprovalForMinors` → CHILD/PRETEEN post escalation | Activity POST: when `escalation.requiresGuardianApprovalForPostContent=true`, create `AihApprovalRequest` instead of writing directly; set `governanceState=pending`; return 202 |
| P2 | `allowMinorInvites=true` → kernel still blocks minor invites | Route: call `resolvePolicyProfile` for minor actors; if `invite.allowed=true`, skip the kernel deny; route the invite through guardian approval flow |
| P3 | Category allowlist API enforcement | Schema: add `categoryId String?` to `ActivityPost`; extend `CreatePostSchema`; validate in POST handler |
| P4 | `allowMinorExternalLinks` | Activity POST: scan `bodyText` for URL patterns for minor actors; 403 if found and flag is false |
| P5 | `enablePrivateThreads` | Add `PRIVATE` to `TrustUnitKind`; gate in trust-units POST |

---

## 8. Validation Results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx next build` | ✅ Build successful |
| Prisma schema unchanged | ✅ Confirmed |
| No new routes added | ✅ Confirmed |
| No UI components modified | ✅ Confirmed |
