# AIH Safe — API Hardening Checklist
**Agent 5 · 2026-05-09**

Per-route security gate checklist. ✅ = verified pass. ⚠️ = gap documented.

---

## Checklist Legend

| Symbol | Meaning |
|---|---|
| ✅ | Verified correct |
| ✅* | Correct after Agent 5 fix |
| ⚠️ | Known gap — see pre-ux-blockers.md |
| ❌ | Not implemented |

---

## POST /api/aihsafe/guardian-links

| Gate | Status |
|---|---|
| `requireAuth()` | ✅ |
| `buildActorContext()` | ✅ |
| Zod input validation | ✅ |
| Governance gate (`canCreateChildAccount`) | ✅ |
| Target user existence check | ✅ |
| Duplicate link check (409) | ✅ |
| DB write before audit emit | ✅ |
| Audit emitted on success | ✅ |
| Audit emitted on governance denial | ✅ |
| Client cannot supply actor identity | ✅ |
| No escalation path (adults only) | ✅ |

---

## GET /api/aihsafe/guardian-links

| Gate | Status |
|---|---|
| `requireAuth()` | ✅ |
| `buildActorContext()` | ✅ |
| Only returns relationships for current actor | ✅ |
| Cursor pagination validated | ✅ |
| Display names resolved server-side | ✅ |

---

## GET /api/aihsafe/approvals

| Gate | Status |
|---|---|
| `requireAuth()` | ✅ |
| `buildActorContext()` | ✅ |
| Scoped to `approverId = user.id` | ✅ |
| `?state=` validated against whitelist | ✅* (fixed in Agent 5) |
| Cursor pagination validated | ✅ |

---

## POST /api/aihsafe/approvals (resolve)

| Gate | Status |
|---|---|
| `requireAuth()` | ✅ |
| `buildActorContext()` | ✅ |
| Zod input validation | ✅ |
| Approval ownership check (`approverId === user.id`) | ✅ |
| Terminal state fast-fail (409 on non-pending) | ✅ |
| Expiry check | ✅ |
| Governance gate (`canApproveChildAction`) | ✅ |
| Audit emitted on governance denial | ✅ |
| Atomic state transition (`updateMany` state guard) | ✅* (fixed in Agent 5) |
| Sibling request revocation | ✅* (added in Agent 5) |
| Audit emitted after state write | ✅ |
| `contextJson` not exposed in response DTO | ✅ |
| Deferred action re-execution on approve | ⚠️ not implemented — BLOCKER 1 |

---

## POST /api/aihsafe/family

| Gate | Status |
|---|---|
| `requireAuth()` | ✅ |
| `buildActorContext()` | ✅ |
| Zod input validation | ✅ |
| Governance gate (`canCreateTrustUnit { kind: "family" }`) | ✅ |
| Audit emitted on governance denial | ✅ |
| Escalation: `selectApprovalRecipients` | ✅* (uses shared helper) |
| Escalation: no-eligible-guardian guard | ✅ |
| Escalation: `AihApprovalRequest` created | ✅ |
| Escalation: audit emitted | ✅ |
| Escalation: 202 returned | ✅ |
| Success: DB write before audit | ✅ |
| `memberIds` consent model | ⚠️ no per-member consent check — BLOCKER 4 |
| Multi-guardian fan-out | ⚠️ single-guardian only — BLOCKER 2 |

---

## GET /api/aihsafe/family

| Gate | Status |
|---|---|
| `requireAuth()` | ✅ |
| `buildActorContext()` | ✅ |
| Scoped to actor's active memberships | ✅ |
| Cursor pagination validated | ✅ |

---

## POST /api/aihsafe/trust-units

| Gate | Status |
|---|---|
| `requireAuth()` | ✅ |
| `buildActorContext()` | ✅ |
| Zod input validation | ✅ |
| Governance gate (`canCreateTrustUnit`) | ✅ |
| Audit emitted on governance denial | ✅ |
| Escalation: `selectApprovalRecipients` | ✅* |
| Escalation: all guards present | ✅ |
| Success: `AihTrustUnitMeta` sidecar created | ✅ |
| Success: DB write before audit | ✅ |
| `memberIds` consent model | ⚠️ BLOCKER 4 |
| Multi-guardian fan-out | ⚠️ BLOCKER 2 |

---

## GET /api/aihsafe/trust-units

| Gate | Status |
|---|---|
| `requireAuth()` | ✅ |
| `buildActorContext()` | ✅ |
| Scoped to actor's memberships | ✅ |

---

## POST /api/aihsafe/memberships (join)

| Gate | Status |
|---|---|
| `requireAuth()` | ✅ |
| `buildActorContext()` | ✅ |
| Zod input validation | ✅ |
| Trust unit existence check (404) | ✅ |
| Duplicate membership check (409) | ✅ |
| Governance gate (`canJoinTrustUnit`) | ✅ |
| Audit emitted on governance denial | ✅ |
| Escalation: `selectApprovalRecipients` | ✅* |
| Success: DB write before audit | ✅ |
| Multi-guardian fan-out | ⚠️ BLOCKER 2 |
| Exit / remove / promote | ❌ not implemented — BLOCKER 3 |

---

## POST /api/aihsafe/invites

| Gate | Status |
|---|---|
| `requireAuth()` | ✅ |
| `buildActorContext()` | ✅ |
| Zod input validation | ✅ |
| `targetAgeTier` derived server-side when target has account | ✅* (fixed in Agent 5) |
| Client adult/elder hint discarded (safe-by-default) | ✅* (fixed in Agent 5) |
| Governance gate (`canInviteToTrustUnit`) | ✅ |
| Audit emitted on governance denial | ✅ |
| Escalation: `selectApprovalRecipients` | ✅* |
| Escalation: `AihApprovalRequest` created (no Invite yet) | ✅ |
| Success: delegates to `lib/invite/createInvite` | ✅ |
| Minor invite without escalation if no account and no client hint | ⚠️ documented gap |
| Multi-guardian fan-out | ⚠️ BLOCKER 2 |

---

## GET /api/aihsafe/invites

| Gate | Status |
|---|---|
| `requireAuth()` | ✅ |
| Scoped to `senderId = user.id` | ✅ |

---

## Cross-Cutting Checks

| Check | Status |
|---|---|
| All response shapes use envelope helpers (`ok`, `created`, `accepted`, `governanceDenied`, etc.) | ✅ |
| No raw `NextResponse.json` calls in routes | ✅ |
| `ReasonCode` propagated in all governance error responses | ✅ |
| Actor identity always from `requireAuth()` — never from request body | ✅ |
| `passwordHash` never selected in any AIH Safe query | ✅ |
| Audit actor always server-derived | ✅ |
| `contextJson` never returned in any DTO | ✅ |
| Pagination `limit` clamped 1–100 | ✅ |
| `buildActorContext` throws on non-active users | ✅ |
