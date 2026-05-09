# AIH Safe — Persistence Contract
**Agent 2.5 · Schema/Persistence Architect · 2026-05-09**

Defines the contract between the AIH Safe service layer and the persistence layer.
This is the operating agreement that agents must honor when implementing DB-backed services.

---

## Contract Parties

| Party | Role |
|---|---|
| **Governance kernel** (`lib/aihsafe/governance/`) | Pure synchronous — never touches DB |
| **Visibility service** (`lib/aihsafe/visibility/`) | Pure synchronous — never touches DB |
| **Audit service** (`lib/aihsafe/audit/`) | Async — owns writes to `aih_audit_events` (Phase 3+) |
| **Graph service** (`lib/aihsafe/graph/`) | Async — owns all reads from AIH Safe tables |
| **Invite service** (`lib/aihsafe/invites/`) | Delegates writes to `lib/invite/index.ts`; reads AIH tables |
| **API routes** (`app/api/aihsafe/`) | Caller — assembles contexts, invokes governance, emits audit events |

---

## Read Ownership

Each service may only read from the tables listed here. Cross-service direct Prisma reads are forbidden.

| Service | May read |
|---|---|
| Graph service | `User`, `TrustUnit`, `TrustUnitMember`, `AihTrustUnitMeta`, `AihFamilyUnit`, `AihFamilyUnitMember`, `AihGuardianRelationship`, `ConnectionRequest`, `Invite` |
| Invite service | `Invite`, `User`, `AihGuardianRelationship` |
| Audit service | `AihAuditEvent` (for `getAuditEventsForTarget`) |
| Governance/Visibility | **None** (receives pre-fetched context; never calls Prisma) |
| API routes | `User` (via `getCurrentUser()` / `requireAuth()`); delegates all AIH reads to graph service |

---

## Write Ownership

| Service | May write |
|---|---|
| Graph service | **None** (pure read) |
| Governance/Visibility | **None** (pure decision) |
| Audit service | `AihAuditEvent` (one table only) |
| Invite service | Delegates all writes to `lib/invite/index.ts` (no direct Prisma writes) |
| API routes | `AihFamilyUnit`, `AihFamilyUnitMember`, `AihGuardianRelationship`, `AihApprovalRequest`, `AihTrustUnitMeta` — via service calls, never raw Prisma in route handlers |
| Future membership service | `AihFamilyUnitMember`, `TrustUnitMember` |

---

## Context Assembly Protocol

The governance kernel never fetches data. The caller (API route) is responsible for assembling `ActorContext` and `TargetContext` before invoking any governance function.

**Required assembly order:**

```
1. getCurrentUser() → raw User row
2. graph.listMembershipsForUser(actor.id) → TrustUnitMembership[]
3. graph.getGuardianRelationshipsForGuardian(actor.id) → GuardianRelationship[] (as guardian)
4. graph.getGuardianRelationshipsForChild(actor.id) → GuardianRelationship[] (as child)
5. graph.listRelationshipEdgesForUser(actor.id) → RelationshipEdge[]
6. governance.deriveAgeTier(actor.dateOfBirth) → AgeTier
7. governance.deriveFamilySafeRole(ageTier, guardianRelationships) → FamilySafeRole
8. Construct ActorContext { actorUserId, ageTier, systemRole, familySafeRole, memberships, ... }

For target-scoped actions:
9. graph.getTrustUnitById(trustUnitId) → TrustUnit | null
10. Compute sharedTrustUnitIds (intersect actor memberships with target memberships)
11. Compute actorTrustUnitRole (actor's role in target trust unit)
12. Construct TargetContext { ... }

13. governance.canDoX(actorContext, targetContext) → GovernanceDecision
14. If GovernanceDecision.auditEventType: emitAuditEvent(...)
15. If GovernanceDecision.requiredApproval: create AihApprovalRequest(...)
```

---

## Audit Emission Contract

Every API route that invokes a governance gate **must** call `emitAuditEvent` with the `auditEventType` from the `GovernanceDecision`, regardless of whether the decision is `allowed` or denied.

```ts
const decision = canPostContent(actor, target);
if (decision.auditEventType) {
  await emitAuditEvent({
    kind: decision.auditEventType,
    actorId: actor.actorUserId as string,
    targetId: target.trustUnitId as string ?? null,
    meta: { allowed: decision.allowed, reasonCode: decision.reasonCode },
  });
}
```

**Phase 2 (current):** `emitAuditEvent` returns `AuditEventDraft` with `_persistenceDeferred: true`. No DB write occurs.

**Phase 3 (next):** `emitAuditEvent` writes to `aih_audit_events` via Prisma. Return type changes to `AuditEventEnvelope`. The `_persistenceDeferred` marker is removed from the returned object.

---

## Approval Request Contract

When `GovernanceDecision.requiredApproval === true`:

1. The API route creates an `AihApprovalRequest` row in `PENDING` state.
2. `expiresAt` is set to `now() + 48 hours` (configurable constant, not hardcoded).
3. The original action is **not** executed. The route returns HTTP 202 Accepted with the approval request ID.
4. When a guardian calls the approve/deny endpoint:
   - The route verifies `canApproveChildAction(guardianActor, { targetUserId: requestor.id, ... })`
   - On pass: updates `AihApprovalRequest.state` to `APPROVED`, sets `resolvedAt`, proceeds with the original action
   - On deny: updates state to `DENIED`, sets `resolvedAt`, does not proceed
5. The approval request ID links back to the original action context via `contextJson` (serialized `TargetContext`).

---

## Data Retention Rules

| Table | Retention | Delete mechanism |
|---|---|---|
| `aih_audit_events` | Permanent (legal hold) | Never deleted; archive to cold storage after 1 year (Phase 5) |
| `aih_approval_requests` | 90 days after resolution | Background sweep job (Phase 3) |
| `aih_guardian_relationships` | Soft-delete via `revokedAt` | No hard delete |
| `aih_family_unit_members` | Soft-delete via `exitedAt` | No hard delete |
| `aih_family_units` | Soft-delete via `dissolvedAt` + status change | No hard delete |

---

## Phase 3 Implementation Checklist

- [ ] Apply Prisma schema diff (see `schema-plan.md`)
- [ ] Run `db:push` + `db:generate`
- [ ] Implement graph service stubs with Prisma queries
- [ ] Update `emitAuditEvent` to write to `AihAuditEvent` table
- [ ] Update `getAuditEventsForTarget` to query `AihAuditEvent`
- [ ] Add approval request creation logic (new service or in API routes)
- [ ] Write context assembly helper (`lib/aihsafe/context/buildActorContext.ts`)
- [ ] Confirm `npm run build` passes with no type errors
