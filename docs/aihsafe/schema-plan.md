# AIH Safe — Schema Plan
**Agent 2.5 · Schema/Persistence Architect · 2026-05-09**

---

## Phase Overview

| Phase | Scope | Status |
|---|---|---|
| Phase 0 | Base scaffold, types, stubs | Done |
| Phase 1 | Core graph service | Done |
| Phase 2 | Governance kernel (pure) | Done |
| **Phase 2.5** | **Schema design (this doc)** | **Planning** |
| Phase 3 | Schema apply + graph service impl | Next |
| Phase 4 | API routes + UI components | Future |

---

## New Prisma Models Required

Six additive models are needed. None modify existing Prisma models.

### 1 · `AihFamilyUnit` → `aih_family_units`

**Purpose:** Represents a named family grouping. One or more adults (guardians) plus zero or more children. Not the same as `TrustUnit`.

**Key fields:**
- `id` — cuid, PK
- `name` — family display name
- `status` — enum: `active | dissolved`
- `createdByUserId` — FK → `User.id`
- `createdAt`, `updatedAt`, `dissolvedAt`

**Relationships:**
- Has many `AihFamilyUnitMember` (join table)

---

### 2 · `AihFamilyUnitMember` → `aih_family_unit_members`

**Purpose:** Join table linking a `User` to a `AihFamilyUnit` with a role.

**Key fields:**
- `id` — cuid, PK
- `familyUnitId` — FK → `aih_family_units.id`
- `userId` — FK → `User.id`
- `role` — enum: `guardian | child | adult`
- `joinedAt`, `exitedAt`

**Unique constraint:** `(familyUnitId, userId)`

---

### 3 · `AihGuardianRelationship` → `aih_guardian_relationships`

**Purpose:** Establishes a guardian↔child relationship with a permission level. Drives all minor-governance escalation logic.

**Key fields:**
- `id` — cuid, PK
- `guardianUserId` — FK → `User.id`
- `childUserId` — FK → `User.id`
- `kind` — enum: `parent | grandparent | legal_guardian | trusted_adult`
- `permissionLevel` — enum: `view_only | approver | full_control`
- `establishedAt`, `revokedAt`

**Unique constraint:** `(guardianUserId, childUserId)` — one relationship per pair (permissionLevel can change via update, not duplicate rows)

---

### 4 · `AihApprovalRequest` → `aih_approval_requests`

**Purpose:** Persistent record of a governance escalation — an action a minor attempted that requires guardian sign-off.

**Key fields:**
- `id` — cuid, PK
- `requestorId` — FK → `User.id` (the minor)
- `approverId` — FK → `User.id` (the guardian)
- `actionKind` — string (maps to `AuditEventKind`)
- `state` — enum: `pending | approved | denied | revoked | expired`
- `contextJson` — jsonb (serialized TargetContext sufficient to re-run the gate)
- `expiresAt` — deadline for guardian response
- `resolvedAt`, `createdAt`, `updatedAt`

**Index:** `(approverId, state)` for guardian inbox queries.

---

### 5 · `AihAuditEvent` → `aih_audit_events`

**Purpose:** Durable record of governance decisions and significant actions. Replaces the `AuditEventDraft` in-memory pattern once this table exists.

**Key fields:**
- `id` — cuid, PK
- `kind` — string (maps to `AuditEventKind`)
- `actorId` — string (User.id — not FK to preserve events for deleted users)
- `targetId` — string? (nullable — resource being acted on)
- `meta` — jsonb
- `createdAt`

**Index:** `(targetId, createdAt DESC)` for per-resource audit log retrieval.

**No FK on `actorId`/`targetId`:** Events must survive user deletion (legal hold requirement). Store raw string IDs.

---

### 6 · `AihTrustUnitMeta` → `aih_trust_unit_meta`

**Purpose:** Extends the existing `TrustUnit` with AIH Safe metadata (`kind`, `visibilityScope`, `maxMemberCount`). Avoids modifying the existing `TrustUnit` model.

**Key fields:**
- `trustUnitId` — PK + unique FK → `TrustUnit.id` (1:1)
- `kind` — enum: `family | peer | extended | guardian`
- `defaultVisibilityScope` — string (maps to `VisibilityScope`)
- `maxMemberCount` — int, default 3
- `createdAt`, `updatedAt`

**Rationale for extension table vs modifying `TrustUnit`:** The existing `TrustUnit` model is owned by the existing codebase. Adding columns risks breaking existing queries. A 1:1 extension sidecar is additive and safe.

---

## Deferred Models (Phase 4+)

| Model | Reason Deferred |
|---|---|
| `AihContentPost` | Needs storage integration + media URLs |
| `AihContentVisibilityRule` | Depends on `AihContentPost` |
| `AihNotification` | Needs notification delivery infra |
| `AihTrustExpansionRequest` | Low priority; `AihApprovalRequest` covers it |

---

## Constraints and Conventions

1. Every new model uses `@@map("aih_*")` prefix.
2. All FKs to `User.id` use `onDelete: Restrict` — never cascade-delete guardian/audit data.
3. All junction tables have a composite unique constraint on the natural key.
4. Soft-delete via `revokedAt` / `dissolvedAt` / `exitedAt` — no hard deletes on relationship data.
5. `contextJson` fields use Prisma `Json` type (maps to `jsonb` in Postgres).
6. Enums are declared at schema level with `aih_` prefix to avoid colliding with existing enums.
