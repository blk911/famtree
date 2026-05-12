# Agent 46 — Minor Policy QA / Teen Escalation

**Branch:** `aihsafe-agent-46-minor-policy-qa`  
**Status:** Complete

---

## 1. Problem

`escalationDefaults()` in `lib/aihsafe/policy/defaults.ts` computed `requiresGuardianApprovalForPostContent` with an explicit age-tier guard:

```ts
// Before (incorrect — TEEN excluded):
requiresGuardianApprovalForPostContent:
  (tier === AgeTier.CHILD || tier === AgeTier.PRETEEN) ? requiresApproval : false,
```

This meant TEEN actors always received `requiresGuardianApprovalForPostContent = false`, bypassing the `requireGuardianApprovalForMinors` founder setting entirely for TEENs.

The same function already computed `isMinor = isMinorTier(tier)` (returns `true` for CHILD, PRETEEN, **and TEEN**) and used it correctly for `requiresGuardianApprovalForSpaceJoin` and `requiresGuardianApprovalForTrustExpansion`. Only the post-content line was inconsistent.

---

## 2. Fix

**File:** `lib/aihsafe/policy/defaults.ts` — `escalationDefaults()`

```ts
// After (correct — TEEN included via isMinor):
requiresGuardianApprovalForPostContent:
  isMinor ? requiresApproval : false,
```

`isMinor` is `isMinorTier(tier)`, which evaluates to:

| AgeTier  | `isMinor` | `requiresGuardianApprovalForPostContent` |
|----------|-----------|------------------------------------------|
| CHILD    | true      | `requiresApproval` (founder-controlled)  |
| PRETEEN  | true      | `requiresApproval` (founder-controlled)  |
| TEEN     | true      | `requiresApproval` (founder-controlled)  |
| UNKNOWN  | false     | `false` (conservative; no escalation)    |
| ADULT    | false     | `false`                                  |
| ELDER    | false     | `false`                                  |

---

## 3. UNKNOWN Tier Behavior (Confirmed Safe)

`isMinorTier(AgeTier.UNKNOWN)` returns `false`. UNKNOWN actors:
- **Do not** trigger post escalation (`requiresGuardianApprovalForPostContent = false`)
- Are treated conservatively at the **scope** level (TEEN-equivalent visibility, not adult)
- Are **not** escalated to a guardian approval queue (they may not have a guardian relationship at all)

This matches the design intent documented in the header of `defaults.ts`:
> "The governance kernel is NOT modified. The policy layer is additive."

UNKNOWN escalation would require a separate founder setting and separate UX (no-guardian path). That is out of scope here.

---

## 4. End-to-End TEEN Flow (Post Agent 46)

1. TEEN calls `POST /api/aihsafe/activity`
2. `isMinorTier(actor.ageTier)` → `true` → `resolvePolicyProfile` is called
3. `policy.escalation.requiresGuardianApprovalForPostContent` → now `true` when `requireGuardianApprovalForMinors=true`
4. `selectApprovalRecipients(actor.guardedByRelationships)` → selects guardian(s)
5. `AihApprovalRequest` row(s) created with `actionKind = "activity.post_pending"`
6. Returns **202 Accepted** with `PendingEscalationDTO`
7. Guardian approves → `executeDeferredAction("create_activity_post")` → `AihActivityPost` created

No other files required changes. The activity route, executor, guardian inbox, and child escalation UI were all already generic over `actionKind`.

---

## 5. Files Modified

| File | Change |
|---|---|
| `lib/aihsafe/policy/defaults.ts` | `requiresGuardianApprovalForPostContent`: `(CHILD \|\| PRETEEN)` → `isMinor` |

---

## 6. Validation Results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| Prisma schema unchanged | ✅ Confirmed |
| No new DB columns | ✅ Confirmed |

---

## 7. Behavior Matrix (Post Fix)

| Founder setting | Actor tier | `requiresGuardianApprovalForPostContent` | POST result |
|---|---|---|---|
| `requireGuardianApprovalForMinors=true`  | CHILD   | true  | 202 Accepted (escalated) |
| `requireGuardianApprovalForMinors=true`  | PRETEEN | true  | 202 Accepted (escalated) |
| `requireGuardianApprovalForMinors=true`  | TEEN    | true  | 202 Accepted (escalated) ← **fixed** |
| `requireGuardianApprovalForMinors=false` | CHILD   | false | 201 Created (direct)     |
| `requireGuardianApprovalForMinors=false` | PRETEEN | false | 201 Created (direct)     |
| `requireGuardianApprovalForMinors=false` | TEEN    | false | 201 Created (direct)     |
| any                                       | UNKNOWN | false | 201 Created (direct)     |
| any                                       | ADULT   | false | 201 Created (direct)     |

---

## 8. Remaining Gaps (Inherited from Agent 45)

| Gap | Notes |
|---|---|
| Executor idempotency | No `approvalRequestId` FK on `AihActivityPost`. Rare double-execution would create a duplicate post. Mitigated by atomic approval-route transition. |
| Post expiry notification | If escalation expires (72h TTL), child is not notified. Post is silently dropped. |
| Guardian push notification | No push/email when approval request is created. Guardian discovers via inbox polling. |
| Approved post feed refresh | `ActivityFeed` is not told a new post was created via approval; child must reload. |
| UNKNOWN escalation path | UNKNOWN users with a guardian could theoretically be escalated. Not implemented — no founder setting or UX for this case yet. |
