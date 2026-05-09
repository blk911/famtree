# AIH Safe — Mutation Boundaries
**AIH Safe API Contract Architect — contracts only. No live routes or persistence.**
**Agent 2.75 · 2026-05-09**

Defines who owns writes, who evaluates governance, and which mutations require escalation.
This is the authoritative boundary map — no exceptions without architect review.

---

## Boundary Axioms

1. **Governance is always synchronous and deterministic.** Never async. Never touches DB.
2. **Graph service is always read-only.** Never writes.
3. **Audit emission is always the API route's responsibility.** No service emits on its own.
4. **Approval-required mutations never mutate final state immediately.** They create an `AihApprovalRequest` and return HTTP 202.
5. **UI never writes directly to DB.** All mutations go through API routes.
6. **No mutation bypasses governance.** Every write is preceded by a governance gate.

---

## Mutation Table

| Action | Governance gate | Write owner | Audit event emitted by | Escalates? |
|---|---|---|---|---|
| Create family unit | `canCreateTrustUnit` | API route → Prisma `AihFamilyUnit` | API route | No |
| Dissolve family unit | `canManageMembership` | API route → Prisma `AihFamilyUnit.status` | API route | No |
| Create trust unit | `canCreateTrustUnit` | API route → Prisma `TrustUnit` + `AihTrustUnitMeta` | API route | No |
| Dissolve trust unit | `canManageMembership` | API route → Prisma `TrustUnit.status` | API route | No |
| Invite adult to trust unit | `canInviteToTrustUnit` | API route → `lib/invite/index.ts` | API route | No |
| Invite minor to trust unit | `canInviteToTrustUnit` | API route → `AihApprovalRequest` (no invite yet) | API route | **Yes** |
| Minor join trust unit (teen) | `canJoinTrustUnit` | API route → `AihApprovalRequest` (no membership yet) | API route | **Yes** |
| Adult join trust unit | `canJoinTrustUnit` | API route → Prisma `TrustUnitMember` | API route | No |
| Exit trust unit | `canManageMembership` | API route → Prisma `TrustUnitMember.exitedAt` | API route | No |
| Remove member | `canManageMembership` | API route → Prisma `TrustUnitMember.exitedAt` | API route | No |
| Change member role | `canManageMembership` | API route → Prisma `TrustUnitMember.role` | API route | No |
| Create guardian link | `canCreateChildAccount` | API route → Prisma `AihGuardianRelationship` | API route | No |
| Update guardian permission | `canManageMembership` | API route → Prisma `AihGuardianRelationship.permissionLevel` | API route | No |
| Revoke guardian link | `canManageMembership` | API route → Prisma `AihGuardianRelationship.revokedAt` | API route | No |
| Approve approval request | `canApproveChildAction` | API route → Prisma `AihApprovalRequest.state` + deferred action | API route | No |
| Deny approval request | `canApproveChildAction` | API route → Prisma `AihApprovalRequest.state` | API route | No |
| Post content (adult/teen) | `canPostContent` | API route → Prisma `AihContentPost` (Phase 4) | API route | No |
| Post content (child/preteen) | `canPostContent` | API route → `AihApprovalRequest` | API route | **Yes** |
| Comment (adult/teen) | `canComment` | API route → Prisma `AihContentComment` (Phase 4) | API route | No |
| Comment (child/preteen) | `canComment` | API route → `AihApprovalRequest` | API route | **Yes** |
| Send message (adult/teen) | `canMessage` | API route → Prisma `AihMessage` (Phase 4) | API route | No |
| Send message (child/preteen) | `canMessage` | API route → `AihApprovalRequest` | API route | **Yes** |
| Expand trust | `canExpandTrust` | API route → Prisma `TrustUnitMember` | API route | No |
| Update visibility scope | Inline scope check via `isScopeAllowedForAgeTier` | API route → Prisma content scope field | API route | No |

---

## Write Service Map

Each Prisma model is owned by exactly one service. No model is written by two services.

| Prisma model | Write owner | Notes |
|---|---|---|
| `AihFamilyUnit` | API route (direct Prisma) | No service layer yet |
| `AihFamilyUnitMember` | API route (direct Prisma) | Or future membership service |
| `AihGuardianRelationship` | API route (direct Prisma) | Guardian link service (Phase 4) |
| `AihApprovalRequest` | API route (direct Prisma) | Approval service (Phase 4) |
| `AihTrustUnitMeta` | API route (direct Prisma) | On trust unit creation |
| `AihAuditEvent` | `lib/aihsafe/audit/emitAuditEvent` | Only via the audit service — never raw Prisma in routes |
| `TrustUnit` | API route (direct Prisma) | Extends existing; must not break existing flows |
| `TrustUnitMember` | API route (direct Prisma) | Extends existing |
| `Invite` | `lib/invite/index.ts` | Delegated — never raw Prisma from AIH routes |

---

## Escalation Decision Tree

```
API route receives mutation request
  │
  ├─ Assemble ActorContext (see persistence-contract.md §Context Assembly)
  ├─ Assemble TargetContext
  ├─ Call governance gate → GovernanceDecision
  │
  ├── allowed = true
  │     ├── Execute write
  │     ├── emitAuditEvent(decision.auditEventType)
  │     └── Return 200/201 with resource DTO
  │
  ├── allowed = false, requiredApproval = false
  │     ├── emitAuditEvent(GOVERNANCE_DENIED)
  │     └── Return 403 with GovernanceDecisionDTO
  │
  └── allowed = false, requiredApproval = true
        ├── Create AihApprovalRequest { state: pending, expiresAt: now+48h }
        ├── emitAuditEvent(CHILD_ACTION_REQUESTED)
        ├── [stub] Notify guardian (Phase 4)
        └── Return 202 with ApprovalRequestDTO + GovernanceDecisionDTO
```

---

## HTTP Status Code Assignments

| Condition | HTTP status |
|---|---|
| Mutation succeeded | `201 Created` (resource created) or `200 OK` (update) |
| Governance escalation (approval required) | `202 Accepted` |
| Validation error (Zod) | `400 Bad Request` |
| Not authenticated | `401 Unauthorized` |
| Governance hard deny | `403 Forbidden` |
| Resource not found | `404 Not Found` |
| Conflict (duplicate, already member) | `409 Conflict` |
| Unprocessable (escalation already pending) | `422 Unprocessable Entity` |
| Internal server error | `500 Internal Server Error` |

---

## Idempotency Rules

| Mutation | Idempotent? | Behavior on re-submission |
|---|---|---|
| Create family unit | No | 201 on first, 409 if name+creator duplicated |
| Create guardian link | No | 409 if `(guardianUserId, childUserId)` pair already active |
| Approve approval request | Yes | 200 if already APPROVED; 422 if DENIED/EXPIRED/REVOKED |
| Deny approval request | Yes | 200 if already DENIED; 422 if APPROVED/EXPIRED/REVOKED |
| Create audit event | Yes | Duplicate events are acceptable; no unique constraint |
| Exit trust unit | Yes | 200 if already exited (`exitedAt` set) |

---

## Deferred Actions on Approval

When an `AihApprovalRequest` transitions to `APPROVED`, the API route must re-execute the
original deferred action using the stored `contextJson`. The re-execution:

1. Deserializes `contextJson` back into a `TargetContext`
2. Re-assembles `ActorContext` for the original requestor
3. Re-runs the governance gate — **must pass** (if guardian approved, gate must allow)
4. Executes the write as if the original request succeeded
5. Emits `CHILD_ACTION_APPROVED` audit event
6. Returns the resource DTO to the guardian's resolution endpoint

The deferred action does NOT re-validate the original HTTP request body.
The `contextJson` snapshot is the authoritative input.
