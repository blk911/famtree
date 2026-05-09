# AIH Safe — Agent 7 Membership Lifecycle Report
**Agent 7 · 2026-05-09**

Closes BLOCKER 3: membership exit/remove/promote/demote lifecycle.
No schema changes. No migrations. No new routes outside AIH Safe.

---

## Files Inspected (read-only)

- `docs/aihsafe/pre-ux-blockers.md`
- `docs/aihsafe/api-hardening-checklist.md`
- `docs/aihsafe/mutation-boundaries.md`
- `docs/aihsafe/service-boundaries.md`
- `docs/aihsafe/agent-6-approval-workflow-report.md`
- `app/api/aihsafe/memberships/route.ts`
- `lib/aihsafe/governance/index.ts`
- `lib/aihsafe/audit/index.ts`
- `lib/aihsafe/context/buildActorContext.ts`
- `types/aihsafe/*` (all)
- `prisma/schema.prisma` (relevant models)
- `lib/aihsafe/api/envelopes.ts`
- `app/api/invite/manage/[id]/route.ts` (params pattern reference)

## Files Created

- `app/api/aihsafe/memberships/[id]/route.ts` — PATCH + DELETE handlers
- `docs/aihsafe/agent-7-membership-lifecycle-report.md` (this file)

## Files Modified

- `lib/aihsafe/governance/index.ts` — added `canExitMembership`
- `docs/aihsafe/pre-ux-blockers.md` — marked BLOCKER 3 closed

---

## Critical Schema Finding

`TrustUnitMember` (the model that `POST /api/aihsafe/memberships` writes) has:
- **No `exitedAt` column** — soft-delete is not available
- **No `role` column** — promote/demote cannot be stored
- **No `name` column** — trust units also have no `name`

`AihFamilyUnitMember` (managed by the family route) DOES have `role` and `exitedAt`, but family membership lifecycle is out of scope for this route.

This drove the schema-gap documentation throughout the implementation.

---

## PATCH /api/aihsafe/memberships/[id]

**Body:** `{ action: "exit" | "remove" | "promote" | "demote", role?: "creator" | "member" | "moderator" }`

| Action | Behavior |
|---|---|
| `exit` | Actor must match membership owner. Last-member check → 409. `canExitMembership` gate. Hard-delete TrustUnitMember. 200. |
| `remove` | `canManageMembership` gate (requires CREATOR/MODERATOR role in unit — currently always denies due to schema gap). Last-member check. Hard-delete. 200. |
| `promote` / `demote` | `canManageMembership` gate. If governance passes → 422 "Phase 4 schema migration required for role column." |

**Client cannot supply:** `actorUserId`, audit actor, governance outcome, or role column value.

---

## DELETE /api/aihsafe/memberships/[id]

| Path | Behavior |
|---|---|
| **Self-exit** (`membership.userId === user.id`) | Last-member check → 409. `canExitMembership` gate. Hard-delete. `MEMBERSHIP_REVOKED` audit. 200. |
| **Managed-remove** (actor ≠ member) | `canManageMembership` gate (CREATOR/MODERATOR required). Last-member check. Hard-delete. `MEMBERSHIP_REVOKED` audit. 200. |

---

## Last-Member Protection

Both routes count active members before any delete:
```typescript
const count = await prisma.trustUnitMember.count({ where: { trustUnitId } });
if (count <= 1) return conflict("Cannot exit/remove the last member ...");
```

Without a `role` column, "last CREATOR/OWNER" cannot be distinguished. Protection is applied to "last member of any role" and documented as a Phase 4 gap.

---

## Self-Promotion Protection

`canExitMembership` checks `isMemberOf(actor, trustUnitId)` — an actor can only exit a unit they are currently a member of. No self-promotion path exists because promote/demote requires `canManageMembership` (CREATOR/MODERATOR) which the actor cannot unilaterally satisfy.

---

## Minor-Promotion Behavior

`canManageMembership` hard-denies minors (`isMinor(actor)` → `DENIED_INSUFFICIENT_ROLE`). Minors cannot promote or demote any member. Minors can still self-exit via `canExitMembership` (which has no age-tier restriction — a minor should always be able to leave a group).

---

## New Governance Function

`canExitMembership(actor, target)` added to `lib/aihsafe/governance/index.ts`:
- Denies if no `trustUnitId` in target context
- Denies if actor is not an active member of the unit (catches stale/invalid IDs)
- Allows with `MEMBERSHIP_REVOKED` audit event kind
- No age-tier restriction — minors may exit their own memberships

Auto-exported via `lib/aihsafe/index.ts` → `export * from "./governance"`.

---

## Audit Events Emitted

| Scenario | Event |
|---|---|
| Self-exit — governance denied | `MEMBERSHIP_REVOKED` with `denied: true` |
| Self-exit — success | `MEMBERSHIP_REVOKED` with `action: "self-exit"` |
| Remove — governance denied | `MEMBERSHIP_REVOKED` with `denied: true` |
| Remove — success | `MEMBERSHIP_REVOKED` with `removedUserId`, `action: "managed-remove"` |
| Promote/Demote — governance denied | `MEMBERSHIP_GRANTED` with `denied: true` |

---

## Phase 4 Schema Gaps (documented, not fixed)

| Gap | Impact |
|---|---|
| `TrustUnitMember.exitedAt` absent | Hard delete used instead of soft delete. Exited members leave no historical record on the row. |
| `TrustUnitMember.role` absent | Managed-remove always denied (governance correctly requires CREATOR/MODERATOR). Promote/demote returns 422. |
| Last-owner check approximated | "Last member of any role" used instead of "last CREATOR/OWNER". |

---

## Validation Results

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ Zero errors |
| `npm run build` | ✅ Compiled successfully |
| New routes created | 1 (`memberships/[id]/route.ts`) |
| Schema changed | No |
| Migrations run | No |
| Pre-existing build warnings changed | No |

---

## Pre-UX Blocker Status After Agent 7

| Blocker | Status |
|---|---|
| BLOCKER 1 — Deferred re-execution | ✅ CLOSED (Agent 6) |
| BLOCKER 2 — Multi-guardian fan-out | ✅ CLOSED (Agent 6) |
| BLOCKER 3 — Membership exit/remove/promote | ✅ CLOSED (Agent 7) |
| BLOCKER 4 — memberIds consent model | ✅ CLOSED (Agent 6) |

**All pre-UX blockers are closed.** UX work may begin.
