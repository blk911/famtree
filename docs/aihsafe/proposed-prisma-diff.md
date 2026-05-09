# AIH Safe — Proposed Prisma Diff
**Agent 2.5 · Schema/Persistence Architect · 2026-05-09**

**PROPOSAL ONLY. Do NOT edit `prisma/schema.prisma` until Agent 3.**

This is the exact block to append to `prisma/schema.prisma` as Phase 3 work begins.
Add it after the last existing model, before the end of the file.
The existing `// ─────` section comments and all existing models stay untouched.

---

## Findings from Existing Schema

- `TrustUnit` model has no `kind`, no `dissolvedAt`, no `name` — AIH Safe needs a sidecar (`AihTrustUnitMeta`).
- `TrustUnitMember` has no `role`, no `exitedAt` — the AIH Safe `TrustUnitMembership` TS type currently uses `null` defaults at the mapping layer; Phase 3 adds these columns.
- No `FamilyUnit`, `GuardianRelationship`, `ApprovalRequest`, or `AuditEvent` model exists.
- `ConnectionRequest` is the closest proxy for `RelationshipEdge`; graph service reads it until a dedicated `aih_relationship_edges` table is added (Phase 4+).

---

## Proposed Schema Addition

Paste this block at the end of `prisma/schema.prisma`:

```prisma
// ═══════════════════════════════════════════════════════════════════════════════
// AIH SAFE — ADDITIVE MODELS
// All models here are additive. No existing model is modified.
// Enums prefixed with Aih to avoid collision with existing schema enums.
// Tables prefixed with aih_ per @@map convention.
// Phase: 3 — apply when ready to wire graph service stubs to real Prisma queries.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── AIH Safe Enums ─────────────────────────────────────────────────────────

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

// ─── AIH Safe Models ────────────────────────────────────────────────────────

/// 1:1 sidecar for existing TrustUnit — adds AIH Safe metadata without modifying the core model.
model AihTrustUnitMeta {
  trustUnitId            String          @id
  trustUnit              TrustUnit       @relation(fields: [trustUnitId], references: [id], onDelete: Restrict)
  kind                   AihTrustUnitKind
  defaultVisibilityScope String          @default("trust_unit")
  maxMemberCount         Int             @default(3)
  createdAt              DateTime        @default(now())
  updatedAt              DateTime        @updatedAt

  @@map("aih_trust_unit_meta")
}

/// Named family grouping — one or more guardians + zero or more children.
/// Not the same as TrustUnit (which is for peer trust groups).
model AihFamilyUnit {
  id              String              @id @default(cuid())
  name            String
  status          AihFamilyUnitStatus @default(active)
  createdByUserId String
  createdBy       User                @relation("AihFamilyUnitCreatedBy", fields: [createdByUserId], references: [id], onDelete: Restrict)
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
  dissolvedAt     DateTime?

  members AihFamilyUnitMember[]

  @@index([createdByUserId])
  @@index([status])
  @@map("aih_family_units")
}

/// Join table — User to AihFamilyUnit with a role.
model AihFamilyUnitMember {
  id           String              @id @default(cuid())
  familyUnitId String
  familyUnit   AihFamilyUnit       @relation(fields: [familyUnitId], references: [id], onDelete: Restrict)
  userId       String
  user         User                @relation("AihFamilyUnitMember", fields: [userId], references: [id], onDelete: Restrict)
  role         AihFamilyMemberRole
  joinedAt     DateTime            @default(now())
  exitedAt     DateTime?

  @@unique([familyUnitId, userId])
  @@index([userId])
  @@index([familyUnitId])
  @@map("aih_family_unit_members")
}

/// Guardian ↔ Child relationship with permission level.
/// Drives all minor-governance escalation logic.
/// onDelete: Restrict — never cascade-delete; revoke via revokedAt instead.
model AihGuardianRelationship {
  id              String               @id @default(cuid())
  guardianUserId  String
  guardian        User                 @relation("AihGuardianOf", fields: [guardianUserId], references: [id], onDelete: Restrict)
  childUserId     String
  child           User                 @relation("AihChildOf", fields: [childUserId], references: [id], onDelete: Restrict)
  kind            AihGuardianKind
  permissionLevel AihGuardianPermLevel
  establishedAt   DateTime             @default(now())
  revokedAt       DateTime?

  @@unique([guardianUserId, childUserId])
  @@index([guardianUserId])
  @@index([childUserId])
  @@map("aih_guardian_relationships")
}

/// Persistent record of a governance escalation — a gated action awaiting guardian approval.
model AihApprovalRequest {
  id          String           @id @default(cuid())
  requestorId String
  requestor   User             @relation("AihApprovalRequestor", fields: [requestorId], references: [id], onDelete: Restrict)
  approverId  String
  approver    User             @relation("AihApprovalApprover", fields: [approverId], references: [id], onDelete: Restrict)
  actionKind  String           // maps to AuditEventKind
  state       AihApprovalState @default(pending)
  contextJson Json             // serialized TargetContext for re-running the gate on resolution
  expiresAt   DateTime
  resolvedAt  DateTime?
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  @@index([approverId, state])
  @@index([requestorId])
  @@index([expiresAt])
  @@map("aih_approval_requests")
}

/// Durable audit log — governance decisions and significant actions.
/// actorId / targetId are plain strings (no FK) so events survive user deletion.
model AihAuditEvent {
  id        String   @id @default(cuid())
  kind      String   // maps to AuditEventKind
  actorId   String   // plain string — no FK (legal hold requirement)
  targetId  String?  // nullable — resource being acted on
  meta      Json
  createdAt DateTime @default(now())

  @@index([targetId, createdAt(sort: Desc)])
  @@index([actorId, createdAt(sort: Desc)])
  @@index([kind])
  @@index([createdAt(sort: Desc)])
  @@map("aih_audit_events")
}

// ═══════════════════════════════════════════════════════════════════════════════
// END AIH SAFE — ADDITIVE MODELS
// ═══════════════════════════════════════════════════════════════════════════════
```

---

## Relation Additions Required on Existing Models

The new models reference `User` via relation fields. Prisma requires the _back-relations_ to be declared on `User` as well.

Add these relation fields to the `User` model (inside the existing `model User { ... }` block):

```prisma
  // AIH Safe — added by Agent 3 (do not add until Phase 3)
  aihFamilyUnitsCreated     AihFamilyUnit[]            @relation("AihFamilyUnitCreatedBy")
  aihFamilyUnitMemberships  AihFamilyUnitMember[]      @relation("AihFamilyUnitMember")
  aihGuardianRelationships  AihGuardianRelationship[]  @relation("AihGuardianOf")
  aihGuardedByRelationships AihGuardianRelationship[]  @relation("AihChildOf")
  aihApprovalRequestsMade   AihApprovalRequest[]       @relation("AihApprovalRequestor")
  aihApprovalRequestsPending AihApprovalRequest[]      @relation("AihApprovalApprover")
```

And add the back-relation on `TrustUnit`:

```prisma
  // AIH Safe — added by Agent 3
  aihMeta AihTrustUnitMeta?
```

---

## Validation After Apply

```bash
npm run db:push        # should report N new tables created, 0 tables dropped
npm run db:generate    # regenerate Prisma client
npm run build          # must pass with no type errors
```

If `db:push` reports any existing table modifications (not just additions), **stop and investigate** — something in the diff is touching an existing model unintentionally.
