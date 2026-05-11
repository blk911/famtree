# AIH Safe — Invite Approval Flow

## Overview

When an adult wants to invite a minor into the network, the invite is not sent immediately. Instead, it is held as a pending `AihApprovalRequest` until the minor's guardian approves or declines it.

---

## Actors

| Actor | Role |
|-------|------|
| **Sender** | Adult initiating the invite (has `AgeTier.ADULT` or `ELDER`) |
| **Guardian** | Adult with `APPROVER` or `FULL_CONTROL` permission over the minor |
| **Recipient** | The minor being invited (email address; may not have an account yet) |

---

## State machine

```
                    ┌─────────────────┐
                    │   (no record)   │
                    └────────┬────────┘
                             │ sendChildInvite()
                             ▼
                    ┌─────────────────┐
                    │     DRAFT       │  AihApprovalRequest.state = "pending"
                    │ (awaiting       │  No Invite record exists yet
                    │  guardian)      │
                    └────────┬────────┘
               approve()    │    decline()
            ┌───────────────┴───────────────┐
            ▼                               ▼
   ┌─────────────────┐             ┌─────────────────┐
   │      SENT       │             │    DECLINED     │  ← terminal
   │ AihApprovalReq  │             │ AihApprovalReq  │
   │ state=approved  │             │ state=denied    │
   │ Invite PENDING  │             └─────────────────┘
   └────────┬────────┘
            │ identity challenge passed
            ▼
   ┌─────────────────┐
   │    ACCEPTED     │  Invite.status = ACCEPTED  ← terminal
   └─────────────────┘
            │ registration completed
            ▼
   ┌─────────────────┐
   │    ACCEPTED     │  Invite.status = REGISTERED ← terminal
   └─────────────────┘
```

Other terminal states reachable from SENT:
- `EXPIRED` — Invite TTL elapsed or max identity-challenge attempts exhausted
- `REVOKED` — Sender cancelled (`Invite.status = CANCELLED`)

---

## AIHInviteState ↔ persistence mapping

| `AIHInviteState` | Source table | Field value |
|-----------------|--------------|-------------|
| `DRAFT` | `AihApprovalRequest` | `state = "pending"` |
| `SENT` | `AihApprovalRequest` | `state = "approved"` (invite created by deferred action) |
| `SENT` | `Invite` | `status = "PENDING"` |
| `ACCEPTED` | `Invite` | `status = "ACCEPTED"` or `"REGISTERED"` |
| `DECLINED` | `AihApprovalRequest` | `state = "denied"` |
| `EXPIRED` | `Invite` | `status = "EXPIRED"` |
| `EXPIRED` | `AihApprovalRequest` | `state = "expired"` |
| `REVOKED` | `Invite` | `status = "CANCELLED"` |
| `REVOKED` | `AihApprovalRequest` | `state = "revoked"` |

---

## Service function signatures

```ts
// lib/aihsafe/invites/index.ts

sendChildInvite(
  senderId:       UserId,    // adult initiating the invite
  guardianId:     UserId,    // guardian who must approve
  recipientEmail: string,    // minor's email
  relationship:   string     // sender's relationship to recipient
): Promise<{ inviteId: InviteId; state: AIHInviteState }>

getInviteState(inviteId: InviteId): Promise<AIHInviteState>

guardianApproveInvite(guardianId: UserId, inviteId: InviteId): Promise<void>

guardianDeclineInvite(guardianId: UserId, inviteId: InviteId): Promise<void>
```

The `inviteId` returned by `sendChildInvite` is an `AihApprovalRequest.id`. After the guardian approves and `executeDeferredAction` runs, the actual `Invite` record gets its own ID. `getInviteState` handles both IDs transparently.

---

## Sequence: adult invites a minor

```
Adult  →  POST /api/aihsafe/invites  →  checkInviteLimits()
                                     →  canInviteToTrustUnit()  →  escalate (targetAgeTier is minor)
                                     →  AihApprovalRequest.create (state=pending)
                                     →  202 Accepted { approvalRequestId, expiresAt }

Guardian  →  GET /api/aihsafe/approvals  →  sees pending request in inbox
          →  POST /api/aihsafe/approvals { requestId, action: "approve" }
                                         →  canApproveChildAction()
                                         →  AihApprovalRequest.update (state=approved)
                                         →  executeDeferredAction("invite_member")
                                               → Invite.create (status=PENDING)
                                         →  200 { resolved approval DTO }

Recipient  →  receives invite email
           →  GET /invite/[token]       →  identity challenge page
           →  POST /invite/[token]      →  verifyIdentityChallenge()
           →  redirect /register?token=...
```

---

## Sequence: adult invites another adult (no escalation)

```
Adult  →  POST /api/aihsafe/invites  →  checkInviteLimits()
                                     →  canInviteToTrustUnit()  →  allow
                                     →  createInvite()           →  Invite (status=PENDING)
                                     →  201 Created { invite DTO }
```

---

## Error handling

Service functions throw `InviteServiceError` (or `InviteLimitError`). API routes should catch and map:

| Error code | HTTP status | Envelope |
|------------|-------------|---------|
| `INVITE_LIMIT_REACHED` | 429 | `rateLimited(message)` |
| `INVITE_NOT_FOUND` | 404 | `notFound(...)` |
| `INVITE_ALREADY_RESOLVED` | 409 | `conflict(...)` |
| `INVITE_EXPIRED` | 409 | `conflict(...)` |
| `SENDER_INACTIVE` | 403 | `forbidden(...)` |
| `GUARDIAN_INACTIVE` | 403 | `forbidden(...)` |

---

## Limits integration

`sendChildInvite` calls `checkInviteLimits(senderId)` before creating the approval request. This enforces the Agent 41 daily ceiling:

| Tier | Daily invite limit |
|------|--------------------|
| CHILD / PRETEEN | 0 (blocked at governance layer before limits apply) |
| TEEN | 0 (default; configurable via founder settings) |
| UNKNOWN | 0 (conservative path) |
| ADULT / ELDER | unlimited (0 = no ceiling) |

The approval request also counts toward the invite ceiling via `AihApprovalRequest` rows — see Agent 41 `countInvitesToday` for details.

---

## Multi-guardian fan-out

If the sender has multiple eligible guardians (resolved by `selectApprovalRecipients`), the route creates one `AihApprovalRequest` per guardian. When any guardian approves:

1. That request transitions to `"approved"`.
2. All other pending requests for the same action are set to `"revoked"`.
3. `executeDeferredAction` runs exactly once.

`guardianApproveInvite` in the service layer implements the same sibling-revocation logic, ensuring idempotency whether the route or the service layer is the caller.

---

## Idempotency

`sendChildInvite` checks for an existing pending approval request for the same `(senderId, guardianId, recipientEmail)` triplet. If one exists, it returns the existing request ID rather than creating a duplicate. This prevents duplicate guardian notifications on retry.

`executeDeferredAction("invite_member")` also checks for an existing `PENDING` invite before creating a new one — safe to call multiple times.
