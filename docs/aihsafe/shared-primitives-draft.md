# AIH Safe — Shared Primitives
**Agent 0 scaffold · Agent 1 Core Graph finalization · 2026-05-09**

Status: **FINALIZED** (Agent 1). These types are the stable contract.
Changes after this point require architect sign-off and a downstream audit of all service stubs.

---

## Import paths

```ts
// Preferred — barrel import
import type { AIHUserId, TrustUnit, VisibilityScope } from "@/types/aihsafe";

// Leaf import — use when avoiding unrelated symbols
import type { TrustUnit } from "@/types/aihsafe/trust-units";
```

---

## ids.ts — Branded ID Types

All IDs are `string & { readonly __brand: "..." }` — structural, not nominal, but the brand
prevents accidental cross-entity ID mix-ups at compile time.

| Export | Brand | Notes |
|---|---|---|
| `UserId` | `"UserId"` | Generic user ID (Agent 0 compat) |
| `AIHUserId` | `"UserId"` | Alias of `UserId` — **use in new AIH Safe code** |
| `FamilyUnitId` | `"FamilyUnitId"` | |
| `TrustUnitId` | `"TrustUnitId"` | |
| `InviteId` | `"InviteId"` | |
| `MembershipId` | `"MembershipId"` | |
| `AuditEventId` | `"AuditEventId"` | |
| `ContentId` | `"ContentId"` | For future content/media service |
| `GuardianId` | `"GuardianId"` | ID of the guardian user |
| `ChildId` | `"ChildId"` | ID of the child user |
| `GuardianRelationshipId` | `"GuardianRelationshipId"` | ID of the relationship record |

Cast helpers (`asUserId`, `asAIHUserId`, …) are exported — use only at system boundaries.

---

## roles.ts — Role Enums

| Export | Values | Notes |
|---|---|---|
| `SystemRole` | `founder \| admin \| member` | Must match `User.role` DB string exactly |
| `FamilySafeRole` | `guardian \| child \| adult` | Runtime-derived; never stored |
| `TrustUnitRole` | `creator \| member \| moderator` | User's role within a specific TrustUnit |
| `GuardianAuthorityRole` | `view_only \| approver \| full_control` | Re-export alias of `GuardianPermissionLevel` from `guardian.ts` |

---

## age-tiers.ts — Age Tier Classification

Derived from `User.dateOfBirth` at runtime. **Never persisted.**

| Tier | Age Range |
|---|---|
| `CHILD` | under 13 |
| `PRETEEN` | 13–15 |
| `TEEN` | 16–17 |
| `ADULT` | 18–64 |
| `ELDER` | 65+ |
| `UNKNOWN` | *@deprecated* — dateOfBirth absent; treat as ADULT |

`MINOR_TIERS` = [CHILD, PRETEEN, TEEN]. `isMinorTier()` helper exported.

---

## visibility.ts — Visibility Scopes

Resolved at query time by `lib/aihsafe/visibility/`. Governance service validates assignments.

| Scope | Who can see |
|---|---|
| `PRIVATE` | Owner only |
| `GUARDIAN_ONLY` | Owner + registered guardians |
| `FAMILY` | All FamilyUnit members |
| `TRUST_UNIT` | All users in any shared TrustUnit |
| `EXTENDED_TRUST` | All registered tree members (existing tree behavior) |
| `PUBLIC_APPROVED` | Platform-approved; **never valid for CHILD/PRETEEN content** |

`MINOR_ALLOWED_SCOPES` = [PRIVATE, GUARDIAN_ONLY, FAMILY]
`TEEN_ALLOWED_SCOPES` = [PRIVATE, GUARDIAN_ONLY, FAMILY, TRUST_UNIT]

---

## approval-states.ts — Approval State Machine

| State | Meaning |
|---|---|
| `NOT_REQUIRED` | Action needs no approval |
| `PENDING` | Awaiting guardian decision |
| `APPROVED` | Approved |
| `DENIED` | Denied (formerly DECLINED) |
| `REVOKED` | Was approved; later revoked (formerly WITHDRAWN) |
| `EXPIRED` | No decision within consent window |

Terminal states: APPROVED, DENIED, REVOKED, EXPIRED.

---

## invite-states.ts — Invite Lifecycle States

Domain-level states — not a direct mirror of Prisma `InviteStatus`. Mapping is the invites service's responsibility.

| State | Prisma equivalent |
|---|---|
| `DRAFT` | `PENDING` |
| `SENT` | `PENDING` |
| `VIEWED` | `PENDING` (with signal) |
| `ACCEPTED` | `ACCEPTED` |
| `DECLINED` | `EXPIRED` (no exact Prisma match) |
| `EXPIRED` | `EXPIRED` |
| `REVOKED` | `CANCELLED` |

Terminal states: ACCEPTED, DECLINED, EXPIRED, REVOKED.

---

## audit-events.ts — Typed Audit Event Kinds

`AuditEventKind` const object with dot-notation string values (e.g. `"family_unit.created"`).
`AuditEventEnvelope` interface: `{ id, kind, actorId, targetId, createdAt, meta }`.

Full list in `types/aihsafe/audit-events.ts`. **Unchanged from Agent 0.**

---

## trust-units.ts — Graph Primitives

| Export | Purpose |
|---|---|
| `TrustUnitKind` | `family \| peer \| extended \| guardian` |
| `AIHTrustUnit` | Agent 0 compat DTO (3-person, no kind) |
| `TrustUnit` | Full AIH Safe TrustUnit (with kind, dissolved state) |
| `TrustUnitMembership` | User's membership in a TrustUnit, with role |
| `AIHTrustUnitRequest` | Pending TU formation request |
| `RelationshipEdgeKind` | `invited_by \| parent_child \| sibling \| spouse \| trust_unit_member \| guardian_of \| child_of \| connection` |
| `RelationshipEdge` | Directed edge between two users with kind and approval state |
| `TrustAdjacencyResult` | Graph query result: `{ areAdjacent, sharedUnitIds }` |
| `GraphShapeInput` | Input validator type for `assertGraphShape()` |

---

## guardian.ts — Guardian Relationship Types

**Unchanged from Agent 0.** Canonical home of `GuardianPermissionLevel`.

| Export | Values |
|---|---|
| `GuardianRelationshipKind` | `parent \| grandparent \| legal_guardian \| trusted_adult` |
| `GuardianPermissionLevel` | `view_only \| approver \| full_control` |
| `GuardianRelationship` | Full relationship record (draft — Prisma model in Phase 1) |
| `GuardianCheckResult` | `{ isGuardian, permissionLevel, relationship }` |

---

## membership.ts — Membership Types

**Unchanged from Agent 0.**

| Export | Values |
|---|---|
| `MembershipState` | `active \| suspended \| removed \| pending` |
| `MembershipKind` | `family_unit \| trust_unit` |
| `Membership` | Generic membership record |

---

## Naming decisions and collision notes

| Situation | Resolution |
|---|---|
| `GuardianPermissionLevel` vs `GuardianAuthorityRole` | Same type, two names. `guardian.ts` is canonical; `roles.ts` re-exports as alias. No duplicate values. |
| `AIHTrustUnit` vs `TrustUnit` | `AIHTrustUnit` kept for Agent 0 compat (3-person, no kind). Use `TrustUnit` in all new code. |
| `UserId` vs `AIHUserId` | `AIHUserId = UserId` (alias). Same brand. Use `AIHUserId` in new AIH Safe service code. |
| `TWEEN` → `PRETEEN` | Breaking change within AIH Safe namespace only. No existing app code imported this type. |
| Visibility scope names renamed | Breaking change within AIH Safe namespace only. Same rationale. |
