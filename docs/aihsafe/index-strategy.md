# AIH Safe — Index Strategy
**Agent 2.5 · Schema/Persistence Architect · 2026-05-09**

---

## Principles

1. Index every FK that is queried in isolation (guardian lookups, membership lookups).
2. Composite indexes mirror the most common WHERE clause combinations.
3. Partial indexes (WHERE `revokedAt IS NULL`) are preferred for "active only" hot paths — reduces index size and improves read performance.
4. `createdAt DESC` covering indexes for feed-style queries.
5. No index on `meta` / `contextJson` (jsonb) at Phase 3 — add GIN index in Phase 4 only if full-text audit search is required.

---

## `aih_guardian_relationships`

| Index | Columns | Type | Rationale |
|---|---|---|---|
| PK | `id` | B-tree | Default |
| `idx_aih_gr_guardian` | `guardianUserId` | B-tree | `getGuardianRelationshipsForGuardian` lookup |
| `idx_aih_gr_child` | `childUserId` | B-tree | `getGuardianRelationshipsForChild` lookup |
| `idx_aih_gr_active_guardian` | `(guardianUserId)` WHERE `revokedAt IS NULL` | Partial B-tree | Guardian inbox — active relationships only |
| `idx_aih_gr_active_child` | `(childUserId)` WHERE `revokedAt IS NULL` | Partial B-tree | Child's guardian list — active only |
| Unique | `(guardianUserId, childUserId)` | Unique | One row per pair; enforces no duplicates |

**Query served:** `ActorContext.guardianRelationships` population.

---

## `aih_family_units`

| Index | Columns | Type | Rationale |
|---|---|---|---|
| PK | `id` | B-tree | Default |
| `idx_aih_fu_creator` | `createdByUserId` | B-tree | Admin: units created by user |
| `idx_aih_fu_status` | `status` | B-tree | Filter dissolved units |

---

## `aih_family_unit_members`

| Index | Columns | Type | Rationale |
|---|---|---|---|
| PK | `id` | B-tree | Default |
| `idx_aih_fum_family` | `familyUnitId` | B-tree | List members of a family unit |
| `idx_aih_fum_user` | `userId` | B-tree | List families a user belongs to |
| `idx_aih_fum_active_user` | `(userId)` WHERE `exitedAt IS NULL` | Partial B-tree | Active memberships for `ActorContext.memberships` |
| Unique | `(familyUnitId, userId)` | Unique | One membership per user per unit |

---

## `aih_trust_unit_meta`

| Index | Columns | Type | Rationale |
|---|---|---|---|
| PK / FK | `trustUnitId` | B-tree | 1:1 with `TrustUnit.id`; join is always by PK |
| `idx_aih_tum_kind` | `kind` | B-tree | Filter by unit kind (family/peer/etc.) |

---

## `aih_approval_requests`

| Index | Columns | Type | Rationale |
|---|---|---|---|
| PK | `id` | B-tree | Default |
| `idx_aih_ar_approver_state` | `(approverId, state)` | Composite B-tree | Guardian inbox: all pending approvals for me |
| `idx_aih_ar_requestor` | `requestorId` | B-tree | Child's outgoing request list |
| `idx_aih_ar_pending_approver` | `(approverId)` WHERE `state = 'pending'` | Partial B-tree | Hot path: pending-only guardian inbox |
| `idx_aih_ar_expires` | `expiresAt` | B-tree | Background job: sweep expired requests |
| `idx_aih_ar_action_kind` | `actionKind` | B-tree | Audit: how many of each action kind |

---

## `aih_audit_events`

| Index | Columns | Type | Rationale |
|---|---|---|---|
| PK | `id` | B-tree | Default |
| `idx_aih_ae_target` | `(targetId, createdAt DESC)` | Composite B-tree | `getAuditEventsForTarget(targetId, limit)` |
| `idx_aih_ae_actor` | `(actorId, createdAt DESC)` | Composite B-tree | Per-user audit trail |
| `idx_aih_ae_kind` | `kind` | B-tree | Admin: events by kind |
| `idx_aih_ae_created` | `createdAt DESC` | B-tree | Full audit log, newest first |

**No FK on `actorId` / `targetId`** — intentional. Events must not cascade-delete when a user is removed (legal hold).

---

## Estimated Row Volume (Phase 3 target)

| Table | Expected rows at launch | Growth pattern |
|---|---|---|
| `aih_guardian_relationships` | ~100–500 | Linear with users |
| `aih_family_units` | ~50–200 | Linear with families |
| `aih_family_unit_members` | ~200–1000 | 4–6 per family |
| `aih_trust_unit_meta` | = `TrustUnit` row count | 1:1 |
| `aih_approval_requests` | ~10–50/day | Purge after 90 days |
| `aih_audit_events` | ~500–2000/day | Append-only; archive after 1 year |

---

## Index Creation Timing

All indexes should be created **CONCURRENTLY** on Postgres to avoid table locks:

```sql
CREATE INDEX CONCURRENTLY idx_aih_gr_guardian
  ON aih_guardian_relationships (guardian_user_id);
```

Prisma `db push` does not support `CONCURRENTLY`. For production:
- Use Prisma's `@@index` directive for dev/staging
- Use manual migration scripts with `CONCURRENTLY` for production Neon DB
