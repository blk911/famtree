# AIH Safe — Agent 6 Approval Workflow Closure
**Agent 6 · 2026-05-09**

Closed Blockers 1, 2, and 4 from `pre-ux-blockers.md`. No new routes, no schema changes, no migrations.

---

## Files Modified

- `app/api/aihsafe/approvals/route.ts` — wire deferred re-execution on approve
- `app/api/aihsafe/family/route.ts` — fan-out + strip memberIds
- `app/api/aihsafe/trust-units/route.ts` — fan-out + strip memberIds
- `app/api/aihsafe/memberships/route.ts` — fan-out
- `app/api/aihsafe/invites/route.ts` — fan-out

## Files Created

- `lib/aihsafe/approvals/executeDeferredAction.ts` — deferred action handlers
- `docs/aihsafe/agent-6-approval-workflow-report.md` (this file)

## Files Updated

- `lib/aihsafe/approvals/index.ts` — added `executeDeferredAction` export

---

## BLOCKER 1 — Deferred Action Re-execution ✅ CLOSED

**Implementation:** `lib/aihsafe/approvals/executeDeferredAction.ts`

Dispatches by `contextJson.action`. Handlers for all four action kinds:

| Action | Handler behavior |
|---|---|
| `create_family_unit` | Creates `AihFamilyUnit` + creator as guardian; emits `FAMILY_UNIT_CREATED` |
| `create_trust_unit` | Creates `TrustUnit` + `AihTrustUnitMeta` + creator as member; emits `TRUST_UNIT_FORMED` |
| `join_trust_unit` | Idempotent membership create (skips if already member); emits `MEMBERSHIP_GRANTED` |
| `invite_member` | Idempotent invite create (deduplicates by senderId + email + PENDING); emits `INVITE_SENT_CHILD` |

**Design decisions:**
- Governance gate NOT re-run — guardian approval IS the authorization
- Requestor active-status check before any write
- Execution failure is non-fatal to the approval state (approval is already committed); failure logged via swallowed catch in route
- `memberIds` are NOT re-applied on execution (see Blocker 4 fix)

**Wire-up in `approvals/route.ts`:** After atomic state update succeeds and `action === "approve"`, calls `executeDeferredAction(approvalRequest, actor.actorUserId as string)`. Response shape unchanged (`ApprovalRequestDTO`).

---

## BLOCKER 2 — Multi-Guardian Fan-Out ✅ CLOSED

**Implementation:** All four escalation routes now use `Promise.all(eligibleApprovers.map(...))` to create one `AihApprovalRequest` per eligible guardian instead of only `eligibleApprovers[0]`.

The 202 response returns `approvalRequests[0].id` (unchanged contract). Sibling revocation (added in Agent 5) handles "first guardian to resolve wins" automatically.

**Audit meta** now includes `guardianCount: approvalRequests.length` for observability.

**Affected routes:** `family/route.ts`, `trust-units/route.ts`, `memberships/route.ts`, `invites/route.ts`

---

## BLOCKER 4 — `memberIds` Consent Model ✅ CLOSED (option a)

Chose option (a): strip `memberIds` from all create requests at unit creation time.

- `family/route.ts`: creator added as `"guardian"` only; `memberIds` accepted in request body (for contextJson snapshot) but not applied at DB create
- `trust-units/route.ts`: creator added as single member only; same
- `executeDeferredAction.ts`: `memberIds` from contextJson NOT re-applied on deferred execution

Additional members must use the invite flow (`POST /api/aihsafe/invites`).

**`memberIds` field retained in Zod schemas** — removing it would break existing clients that may send it. The field is parsed but silently ignored at the DB write step.

---

## Remaining Blockers (unchanged)

- **BLOCKER 3** — Membership exit / remove / promote: `DELETE` and `PATCH /api/aihsafe/memberships/[id]` not implemented

---

## Validation

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ Zero errors |
| `npm run build` | ✅ Compiled successfully |
| New routes created | No |
| Schema changed | No |
| Migrations run | No |
| Pre-existing build warnings changed | No |
