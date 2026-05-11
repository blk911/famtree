# Agent 41 — Limits Engine Foundation

**Branch:** `aihsafe-agent-41-limits-engine`  
**Status:** Complete

---

## What was built

A lightweight, per-user action-limit layer that gates post, invite, and comment creation before they reach the governance kernel. All enforcement happens at the API route layer; no schema changes were required.

---

## Files changed

| File | Change |
|------|--------|
| `types/aihsafe/policy.ts` | Added `dailyCommentLimit: number` to `LimitsPolicy` |
| `types/aihsafe/audit-events.ts` | Added `LIMIT_REACHED: "limits.reached"` event kind |
| `lib/aihsafe/policy/defaults.ts` | Populated `dailyCommentLimit` in `limitsDefaults()` for all tiers |
| `lib/aihsafe/api/envelopes.ts` | Added `rateLimited(message)` → HTTP 429 helper |
| `lib/aihsafe/limits/index.ts` | Created — core limits engine (see below) |
| `lib/aihsafe/index.ts` | Added `export * from "./limits"` |
| `app/api/aihsafe/activity/route.ts` | Wired `checkPostLimits` before governance check |
| `app/api/aihsafe/invites/route.ts` | Wired `checkInviteLimits` before governance check |
| `app/api/aihsafe/activity/[postId]/comments/route.ts` | Wired `checkCommentLimits` before governance check |

---

## Limits defaults by tier

| Tier | Daily posts | Weekly posts | Daily invites | Daily comments |
|------|-------------|-------------|---------------|----------------|
| CHILD / PRETEEN | 10 | 50 | 0 | 20 |
| TEEN | 20 | 100 | 0 | 30 |
| UNKNOWN | 20 | 100 | 0 | 30 |
| ADULT / ELDER | ∞ | ∞ | ∞ | ∞ |

`0` means unlimited (no counter query is issued).

Invite limits for minors default to `0` (disallowed at the governance layer before limits apply), but the limit field is present so a future guardian override can set a non-zero value.

---

## Limits engine (`lib/aihsafe/limits/index.ts`)

### Public API

```ts
checkPostLimits(userId: string):    Promise<LimitCheckResult>
checkInviteLimits(userId: string):  Promise<LimitCheckResult>
checkCommentLimits(userId: string): Promise<LimitCheckResult>
```

### `LimitCheckResult`

```ts
interface LimitCheckResult {
  allowed: boolean;   // false = block the request
  message: string;    // user-facing; child-appropriate when applicable
  used:    number;    // actions taken in the current window
  limit:   number;    // ceiling; 0 = unlimited
  window:  "day" | "week";
}
```

### UTC day boundary

All daily counters use `Date.UTC(year, month, date)` as the window start — midnight UTC, not local time. This prevents timezone gaming and keeps counters consistent across server instances.

### Weekly post counter

The weekly ceiling uses a rolling 7-day window (`Date.now() - 7 * 24h`), not a Monday-reset calendar week. Children hit this ceiling even if they concentrated all 50 posts in the last 6 days.

### Invite counting strategy

Invite counts sum two tables to prevent bypass:
1. `Invite.senderId` — direct invites (adults + non-escalated paths)
2. `AihApprovalRequest.requestorId` where `actionKind = INVITE_SENT_CHILD` — escalated minor invites

Without counting approval requests, a minor could spam the queue (creating 100 pending escalations) without triggering the daily ceiling.

### Fast path

When both limits for a counter type are `0` (adult/elder), the function returns `{ allowed: true }` without issuing any DB queries.

### `resolvePolicyProfile` dependency

Each check function calls `resolvePolicyProfile(userId)` to load the current policy. This adds 3 DB queries per call (user DOB, founder settings, policy profile row). This is acceptable for the current scale. Future optimization: pass a pre-resolved profile from the route handler to avoid redundancy with `buildActorContext`.

---

## HTTP response for limit violations

```json
{
  "ok": false,
  "error": {
    "message": "You've reached today's sharing limit. Ask your guardian if you need more.",
    "code":    "RATE_LIMITED",
    "status":  429
  },
  "meta": { "requestId": "..." }
}
```

Child/UNKNOWN tiers receive the guardian-referral copy. Adult tiers receive `"You've reached your daily post/invite/comment limit."`.

---

## Route enforcement order

For each gated route, the enforcement sequence is:

```
auth check  →  request parsing  →  limit check (429 if hit)  →  governance check (403 if denied)  →  DB write
```

Limit checks run before governance to keep error messages clean — a child hitting their daily limit gets the limit message, not a governance denial.

---

## What is NOT done in this agent

- UI display of remaining daily quota (pending Agent 42+)
- Founder-configurable limit overrides via settings API (limits are policy-layer defaults only)
- Per-user guardian limit overrides (same)
- `Retry-After` header on 429 responses (can be added without schema change)
- Audit event emission on limit violation (the `LIMIT_REACHED` kind is registered but not wired — add when audit volume analysis is complete)
