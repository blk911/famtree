# AIH Safe — Agent 5 Security Review
**Agent 5 · Integration QA / Security Review · 2026-05-09**

---

## 1. Scope

Files inspected:
- `docs/aihsafe/service-boundaries.md`, `persistence-contract.md`, `api-topology.md`, `dto-contracts.md`, `mutation-boundaries.md`, `approval-flow-map.md`, `transport-normalization.md`, `agent-3-implementation-report.md`, `agent-4-api-report.md`
- `app/api/aihsafe/**/route.ts` (all 6 route files)
- `lib/aihsafe/api/*`, `context/*`, `governance/*`, `audit/*`, `graph/*`, `mappers/*`
- `types/aihsafe/*`

Files modified (narrow fixes only):
- `app/api/aihsafe/approvals/route.ts`
- `app/api/aihsafe/invites/route.ts`
- `app/api/aihsafe/family/route.ts`
- `app/api/aihsafe/trust-units/route.ts`
- `app/api/aihsafe/memberships/route.ts`
- `app/api/aihsafe/guardian-links/route.ts`
- `lib/aihsafe/index.ts`

Files created:
- `lib/aihsafe/approvals/selectApprovalRecipients.ts`
- `lib/aihsafe/approvals/index.ts`
- `docs/aihsafe/agent-5-security-review.md` (this file)
- `docs/aihsafe/pre-ux-blockers.md`
- `docs/aihsafe/api-hardening-checklist.md`

---

## 2. Security Findings

### FINDING 1 — CRITICAL: TOCTOU Race in Approval Resolution

**File:** `app/api/aihsafe/approvals/route.ts` POST

**Issue:** The original code read the approval request state, checked `state !== "pending"`, then called `prisma.aihApprovalRequest.update`. These are two separate DB operations. Under concurrent load, two guardians with separate AihApprovalRequests for the same action could both pass the pending check and both write — producing contradictory state (one "approved", one "denied").

**Fix applied:** Replaced `prisma.aihApprovalRequest.update` with `prisma.aihApprovalRequest.updateMany({ where: { id, state: "pending" }, ... })`. Returns `count: 0` if another writer already transitioned the state. Returns `conflict()` to the second resolver. The original fast-fail checks remain for readable error messages but are no longer the security gate.

---

### FINDING 2 — CRITICAL: Client-Supplied `targetAgeTier` Flowed Into Governance Gate

**File:** `app/api/aihsafe/invites/route.ts`

**Issue:** `targetAgeTier` from the request body was passed directly to `canInviteToTrustUnit(actor, { targetAgeTier })`. The governance kernel escalates only when `targetAgeTier` is a minor tier. A client inviting a real minor could omit `targetAgeTier` or send `"adult"` to skip escalation entirely.

**Fix applied:**
1. Look up the recipient user by email (case-insensitive) before calling governance.
2. If found: use `deriveAgeTier(targetUser.dateOfBirth)` — server-derived, client cannot influence.
3. If not found: use client hint only if it signals a minor tier (safe-by-default: adult/elder hints discarded). This ensures the hint can only make the check MORE restrictive, never less.

---

### FINDING 3 — HIGH: Unvalidated `stateFilter` String Cast

**File:** `app/api/aihsafe/approvals/route.ts` GET

**Issue:** `url.searchParams.get("state") as "pending" | "approved" | ...` is a TypeScript lie. Any string (including empty string, SQL fragments, or unknown values) was passed directly to Prisma. In practice Prisma returns empty results for unrecognized enum values rather than erroring, but this is an input validation gap.

**Fix applied:** Validate against `VALID_APPROVAL_STATES` whitelist at runtime. Invalid values silently default to `"pending"` (the safe default) rather than propagating the invalid string.

---

### FINDING 4 — HIGH: No Sibling-Request Revocation on Approval Resolution

**File:** `app/api/aihsafe/approvals/route.ts` POST

**Issue:** The approval flow map specifies that when a minor has multiple guardians and one resolves, all other pending requests for the same action must be REVOKED to prevent a second guardian from approving an action that was already denied (or vice versa).

**Fix applied:** After the atomic state transition, run:
```typescript
prisma.aihApprovalRequest.updateMany({
  where: { requestorId, actionKind, state: "pending", id: { not: requestId } },
  data:  { state: "revoked", resolvedAt },
})
```
This is a no-op in Phase 3 (single-guardian creates one request) but is necessary for safety when Phase 4 fan-out is added.

---

### FINDING 5 — LOW: Unused `AgeTier` Imports

**Files:** `family/route.ts`, `guardian-links/route.ts`

Imported but never referenced. Removed.

---

### FINDING 6 — LOW: Inline Eligible-Approver Filter Duplicated in 4 Routes

All four escalation routes duplicated the same `r.revokedAt === null && r.permissionLevel in { approver, full_control }` filter inline. Any future change to eligibility rules (e.g., adding a new permission level) required editing all four files.

**Fix applied:** Extracted to `lib/aihsafe/approvals/selectApprovalRecipients.ts`. All four routes now call `selectApprovalRecipients(actor.guardedByRelationships)`.

---

## 3. Confirmed PASS — Items That Were Correct

| Check | Status |
|---|---|
| Every mutation calls `requireAuth()` | ✅ All 6 routes |
| Actor identity is server-derived (`requireAuth` → `buildActorContext`) | ✅ Never from client |
| Governance called before every DB write | ✅ All mutation paths |
| Audit emitted after DB write (not before) | ✅ All routes |
| Audit emitted on governance denial | ✅ All denial paths |
| Audit emitted on escalation | ✅ All escalation paths |
| Approval resolver scoped to assigned approver | ✅ `approverId !== user.id → 404` |
| VIEW_ONLY guardian cannot resolve | ✅ `canApproveChildAction` blocks it |
| Client cannot supply `approvedBy`/`actorUserId` | ✅ Never accepted in any Zod schema |
| Client cannot assign self elevated role | ✅ No role field in `JoinTrustUnitRequest` |
| All responses use envelope helpers | ✅ No raw `NextResponse.json` in routes |
| `contextJson` never exposed in response DTOs | ✅ Mapper excludes it |
| `passwordHash` never fetched in `buildActorContext` | ✅ `select` explicit |
| Pagination cursor is opaque (cuid-based) | ✅ No offset leakage |
| Approval expiry check present | ✅ `expiresAt < new Date()` |

---

## 4. Gaps Not Fixed in This Pass (see pre-ux-blockers.md)

- Deferred action re-execution on guardian approval
- Multi-guardian fan-out (creation side only — revocation is now ready)
- `memberIds` consent model (minors added without explicit consent)
- `TrustUnitMember.role` always returns `"member"` (Phase 4 column)
- Membership exit / remove / promote not implemented
- No test framework exists in this repo

---

## 5. Validation Results

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ Zero errors |
| `npm run build` | ✅ Compiled successfully |
| Existing routes modified | No |
| New routes created | No |
| Schema changed | No |
| Migrations run | No |
| Pre-existing build warnings changed | No |
