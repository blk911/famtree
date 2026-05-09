# AIH Safe — Prisma Mapping
**Agent 2.5 · Schema/Persistence Architect · 2026-05-09**

Maps TypeScript types (from `types/aihsafe/`) to proposed Prisma models and fields.
This is the source-of-truth bridge between the governance layer and the persistence layer.

---

## Branded ID → Prisma Field Type

| TypeScript type | Prisma field type | Notes |
|---|---|---|
| `AIHUserId` / `UserId` | `String` | References existing `User.id` |
| `FamilyUnitId` | `String` | PK of `aih_family_units` |
| `TrustUnitId` | `String` | References existing `TrustUnit.id` |
| `MembershipId` | `String` | PK of `aih_family_unit_members` |
| `GuardianRelationshipId` | `String` | PK of `aih_guardian_relationships` |
| `AuditEventId` | `String` | PK of `aih_audit_events` |
| `ContentId` | `String` | PK of future `aih_content_posts` |

---

## TypeScript Interface → Prisma Model

### `GuardianRelationship` → `AihGuardianRelationship`

| TS field | Prisma field | Type | Notes |
|---|---|---|---|
| `id` | `id` | `String @id @default(cuid())` | — |
| `guardianUserId` | `guardianUserId` | `String` | FK → `User.id` |
| `childUserId` | `childUserId` | `String` | FK → `User.id` |
| `kind` | `kind` | `AihGuardianKind` (enum) | `parent\|grandparent\|legal_guardian\|trusted_adult` |
| `permissionLevel` | `permissionLevel` | `AihGuardianPermLevel` (enum) | `view_only\|approver\|full_control` |
| `establishedAt` | `establishedAt` | `DateTime @default(now())` | — |
| `revokedAt` | `revokedAt` | `DateTime?` | null = active |

**Mapping at read time:** Query rows where `revokedAt IS NULL` for active relationships.

---

### `TrustUnitMembership` → `TrustUnitMember` (existing) + `AihTrustUnitMeta`

The existing `TrustUnitMember` already stores `userId`, `trustUnitId`, `joinedAt`, `status`.

| TS field | Prisma source | Notes |
|---|---|---|
| `id` | `TrustUnitMember.id` | Existing |
| `trustUnitId` | `TrustUnitMember.trustUnitId` | Existing |
| `userId` | `TrustUnitMember.userId` | Existing |
| `role` | `TrustUnitMember.role` | Existing field; map to `TrustUnitRole` |
| `joinedAt` | `TrustUnitMember.joinedAt` | Existing |
| `exitedAt` | `TrustUnitMember.exitedAt` | Add if not present (migration #1) |

`TrustUnit.kind` is provided by `AihTrustUnitMeta.kind` (1:1 sidecar).

---

### `TrustUnit` (AIH Safe) → `TrustUnit` (existing) + `AihTrustUnitMeta`

| TS field | Prisma source | Notes |
|---|---|---|
| `id` | `TrustUnit.id` | Existing |
| `kind` | `AihTrustUnitMeta.kind` | New sidecar field |
| `memberIds` | Derived from `TrustUnitMember` rows | Computed at query time |
| `status` | `TrustUnit.status` | Existing |
| `createdAt` | `TrustUnit.createdAt` | Existing |
| `dissolvedAt` | `TrustUnit.dissolvedAt` | Add if not present (check existing model) |

---

### `AuditEventDraft` / `AuditEventEnvelope` → `AihAuditEvent`

| TS field | Prisma field | Type | Notes |
|---|---|---|---|
| `kind` | `kind` | `String` | Not an enum — forward-compatible |
| `actorId` | `actorId` | `String` | No FK (preserve on user delete) |
| `targetId` | `targetId` | `String?` | Nullable |
| `meta` | `meta` | `Json` | jsonb |
| `createdAt` | `createdAt` | `DateTime @default(now())` | — |
| `id` (envelope only) | `id` | `String @id @default(cuid())` | Assigned on write |
| `_persistenceDeferred` | — | Not stored | Marker only — stripped before write |

---

### `ApprovalState` → `AihApprovalRequest.state` enum

| TS value | Prisma enum value |
|---|---|
| `NOT_REQUIRED` | — (not stored; only `PENDING` and after) |
| `PENDING` | `PENDING` |
| `APPROVED` | `APPROVED` |
| `DENIED` | `DENIED` |
| `REVOKED` | `REVOKED` |
| `EXPIRED` | `EXPIRED` |

---

### `AIHInviteState` → existing `InviteStatus` enum

| AIH TS value | Existing Prisma `InviteStatus` |
|---|---|
| `DRAFT` | `PENDING` |
| `SENT` | `PENDING` |
| `VIEWED` | `PENDING` |
| `ACCEPTED` | `ACCEPTED` |
| `DECLINED` | `EXPIRED` (closest match; add `DECLINED` in Phase 3+) |
| `EXPIRED` | `EXPIRED` |
| `REVOKED` | `CANCELLED` |

**Note:** The existing enum cannot be modified without a migration that touches existing rows. The invite service maps between the two enums at the boundary layer.

---

## Enum Declarations Required

New Prisma enums to add (all with `aih_` prefix in `@@map`):

```prisma
enum AihGuardianKind {
  parent
  grandparent
  legal_guardian
  trusted_adult
  @@map("aih_guardian_kind")
}

enum AihGuardianPermLevel {
  view_only
  approver
  full_control
  @@map("aih_guardian_perm_level")
}

enum AihFamilyUnitStatus {
  active
  dissolved
  @@map("aih_family_unit_status")
}

enum AihFamilyMemberRole {
  guardian
  child
  adult
  @@map("aih_family_member_role")
}

enum AihTrustUnitKind {
  family
  peer
  extended
  guardian
  @@map("aih_trust_unit_kind")
}

enum AihApprovalState {
  pending
  approved
  denied
  revoked
  expired
  @@map("aih_approval_state")
}
```

---

## Existing Model Compatibility Notes

| Existing model | Safe to join? | Notes |
|---|---|---|
| `User` | Yes (read-only from AIH layer) | Join via `userId` string FK |
| `TrustUnit` | Yes | Extended by `AihTrustUnitMeta` (1:1) |
| `TrustUnitMember` | Yes | Used as source for `TrustUnitMembership` TS type |
| `Invite` | Yes (read-only) | Invite service delegates writes back to `lib/invite` |
| `ConnectionRequest` | Yes | Used to populate `RelationshipEdge` until dedicated table exists |
| `ActivityLog` | Parallel, not replaced | AIH audit uses `aih_audit_events`; legacy `ActivityLog` continues |
