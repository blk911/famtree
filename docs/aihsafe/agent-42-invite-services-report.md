# Agent 42 — Invite Service Stub Closure

**Branch:** `aihsafe-agent-42-invite-services`  
**Status:** Complete

---

## Files modified

| File | Change |
|------|--------|
| `lib/aihsafe/invites/index.ts` | Replaced all 4 stub throws with real implementations |

## Files created

| File | Purpose |
|------|---------|
| `docs/aihsafe/agent-42-invite-services-report.md` | This report |
| `docs/aihsafe/invite-approval-flow.md` | Invite lifecycle state machine + sequence diagrams |

---

## Stubs removed

All four stubs that previously threw `"Not implemented — pending Agent 1"` are now implemented:

| Function | Was | Now |
|----------|-----|-----|
| `sendChildInvite()` | `throw new Error("Not implemented")` | Creates `AihApprovalRequest`; returns DRAFT state |
| `getInviteState()` | `throw new Error("Not implemented")` | Dual lookup: `Invite` table OR `AihApprovalRequest` table |
| `guardianApproveInvite()` | `throw new Error("Not implemented")` | Validates, atomically transitions to "approved", runs deferred action |
| `guardianDeclineInvite()` | `throw new Error("Not implemented")` | Validates, atomically transitions to "denied" |

---

## Invite lifecycle implemented

### State machine

```
(none) → sendChildInvite() → DRAFT
DRAFT  → guardianApproveInvite() → SENT   (Invite record created by executeDeferredAction)
DRAFT  → guardianDeclineInvite() → DECLINED
SENT   → identity challenge passed → ACCEPTED
SENT   → TTL elapsed / attempts exhausted → EXPIRED
SENT   → sender cancelled → REVOKED
```

### `AIHInviteState` ↔ persistence

- `DRAFT` = `AihApprovalRequest.state = "pending"` (no Invite record yet)
- `SENT` = `AihApprovalRequest.state = "approved"` OR `Invite.status = "PENDING"`
- `ACCEPTED` = `Invite.status = "ACCEPTED"` or `"REGISTERED"`
- `DECLINED` = `AihApprovalRequest.state = "denied"`
- `EXPIRED`/`REVOKED` = both tables

---

## Guardian approval behavior

`guardianApproveInvite(guardianId, inviteId)`:

1. Loads `AihApprovalRequest` by `inviteId`.
2. Verifies `approverId === guardianId` (returns NOT_FOUND, not FORBIDDEN, to prevent enumeration).
3. Verifies `actionKind === INVITE_SENT_CHILD`.
4. Verifies `state === "pending"` and `expiresAt > now`.
5. **Atomic transition**: `updateMany({ where: { id, state: "pending" }, data: { state: "approved" } })` — count=0 means concurrent resolution, throws `INVITE_ALREADY_RESOLVED`.
6. **Sibling revocation**: revokes other pending approval requests for the same `(requestorId, actionKind)`.
7. **Deferred action**: calls `executeDeferredAction("invite_member")` → creates the `Invite` record. Failure is non-fatal (approval state already committed).
8. Emits `GUARDIAN_CONSENT_GIVEN` audit event.

`guardianDeclineInvite(guardianId, inviteId)`:

Same validation chain, transitions to `"denied"`, emits `GUARDIAN_CONSENT_DENIED`. No invite record is created.

---

## Limits integration

`sendChildInvite` calls `checkInviteLimits(senderId)` before any DB writes:
- UNKNOWN-tier senders: `dailyInviteLimit = 0` → `InviteLimitError` thrown immediately
- ADULT/ELDER: unlimited (fast-path, no DB count)
- `InviteLimitError` extends `InviteServiceError` with code `"INVITE_LIMIT_REACHED"` — route converts to HTTP 429

The approval request also counts toward the sender's daily invite ceiling (Agent 41 `countInvitesToday` sums both `Invite` and `AihApprovalRequest` rows).

---

## UNKNOWN tier behavior

`checkInviteLimits` resolves the sender's policy profile (`resolvePolicyProfile`). For UNKNOWN-tier users:
- `dailyInviteLimit = 0` → blocks immediately with `InviteLimitError`
- No approval request is created
- No DB writes occur

This matches the conservative-path commitment from Agent 38: UNKNOWN users are never granted invite permissions.

---

## Named error types

```ts
export class InviteServiceError extends Error {
  code: string; // e.g. "INVITE_NOT_FOUND", "INVITE_ALREADY_RESOLVED"
}
export class InviteLimitError extends InviteServiceError {
  code = "INVITE_LIMIT_REACHED";
}
```

Routes should catch and map:

| `code` | HTTP |
|--------|------|
| `INVITE_LIMIT_REACHED` | 429 `rateLimited()` |
| `INVITE_NOT_FOUND` | 404 `notFound()` |
| `INVITE_ALREADY_RESOLVED` | 409 `conflict()` |
| `INVITE_EXPIRED` | 409 `conflict()` |
| `SENDER_INACTIVE` / `GUARDIAN_INACTIVE` | 403 `forbidden()` |

---

## Route wiring assessment

| Route | Status |
|-------|--------|
| `POST /api/aihsafe/invites` | Already implements the lifecycle correctly inline (Agent 39). Not rewired — would be redundant and risky. |
| `POST /api/aihsafe/approvals` | Already handles approve/deny via `executeDeferredAction` (Agent 6). Not rewired. |
| `GET /api/aihsafe/approvals` | Guardian inbox works correctly. No change. |

The service functions are the canonical implementation for **programmatic use** (server-to-server, future background jobs, tests). The routes remain authoritative for HTTP consumers.

---

## Validation results

```
npx tsc --noEmit  →  0 errors
npx next build    →  Build successful
```

---

## Remaining invite gaps

| Gap | Notes |
|-----|-------|
| Child-facing "my pending requests" view | No UI to show a child their escalated invite requests (Agent 36 gap, still open) |
| Guardian push notification on new approval request | No push/email when AihApprovalRequest is created for guardian |
| `getInviteState` not called by any route | Useful for a future `GET /api/aihsafe/invites/[id]` endpoint |
| `sendChildInvite` not wired into routes | Route implements inline; this service function is available for direct use |
| Invite TTL 72h vs. Invite record TTL 7d | Approval request expires in 72h; the created invite expires in 7d — deliberate difference |
| No email sent on `sendChildInvite` | Guardian is notified only through the approvals inbox; no email notification exists |
