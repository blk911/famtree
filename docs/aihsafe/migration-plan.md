# AIH Safe — Migration Plan
**Agent 2.5 · Schema/Persistence Architect · 2026-05-09**

---

## Migration Strategy

This repo uses **schema-first push** (`npm run db:push`) with no migrations directory.
There are no `.sql` migration files. All schema changes are applied via Prisma's `db push`.

**Implication:** Every new model must be additive. Destructive changes (DROP COLUMN, enum value removal, FK cascade changes on existing models) require a manual migration script and architect review.

---

## Phase 3 Schema Changes (additive only)

All changes are additions to `prisma/schema.prisma`. No existing model is modified.

### Step 1 — Add new enums

Add 6 new enum declarations in a clearly delimited `// ─── AIH Safe Enums` block:

```prisma
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
```

### Step 2 — Add new models

Add 6 new model declarations in a clearly delimited `// ─── AIH Safe Models` block (after existing models, before closing of schema file).

### Step 3 — Run `db:push`

```bash
npm run db:push      # pushes schema diff to DB
npm run db:generate  # regenerates Prisma client
```

Restart dev server after `db:generate`.

### Step 4 — Implement graph service stubs

After the schema is live, replace `throw new Error("NOT_IMPLEMENTED")` stubs in `lib/aihsafe/graph/index.ts` with real Prisma queries.

---

## Existing Model Extension Notes

### `TrustUnit` — no modification needed

The existing `TrustUnit` model stays untouched. AIH Safe adds a `AihTrustUnitMeta` sidecar (1:1 FK) that stores `kind` and `defaultVisibilityScope`.

### `TrustUnitMember` — check for `exitedAt`

The existing `TrustUnitMember` model may not have an `exitedAt` column. If absent, the `TrustUnitMembership` TS type uses `exitedAt: null` as a default at the mapping layer. Adding `exitedAt DateTime?` to `TrustUnitMember` is the preferred fix — but only do this in Phase 3 after confirming the column is absent.

**How to check:**
```bash
npm run db:studio
# Navigate to TrustUnitMember table — confirm column list
```

If absent: add `exitedAt DateTime?` to the `TrustUnitMember` model in a separate, clearly labeled hunk of the schema diff.

### `ConnectionRequest` — no modification

`ConnectionRequest` is used as a source for `RelationshipEdge` population in the graph service (Phase 3 implementation). No structural change needed — query it read-only from the graph service.

---

## Rollback Plan

Because this repo uses schema-first push (no migration files), rollback is:

1. Remove the new model/enum declarations from `schema.prisma`
2. Run `db:push` — Prisma will detect the removed models and prompt for confirmation before dropping tables
3. Run `db:generate`

**Warning:** Dropping `aih_audit_events` loses audit records. Before any rollback that includes this table, export the table data:

```bash
psql $DATABASE_URL -c "\COPY aih_audit_events TO 'aih_audit_events_backup.csv' CSV HEADER;"
```

---

## Production Push Protocol

The production DB is Neon (PostgreSQL). The repo has no `DATABASE_URL` in `.env` for production by default.

To push to production:
1. Set `DATABASE_URL` to the Neon production connection string in the local shell (not `.env.local` — don't commit it)
2. Run `npm run db:push`
3. Restore `DATABASE_URL` to the dev connection string

**Never run `db:push` on production without verifying the diff first:**
```bash
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script
```

---

## Order of Operations for Agent 3

1. Apply proposed Prisma diff (see `schema-plan.md` fenced block)
2. `npm run db:push`
3. `npm run db:generate`
4. Restart dev server
5. Implement `lib/aihsafe/graph/index.ts` stubs with real Prisma queries
6. Run `npm run build` to verify no regressions
7. Implement `lib/aihsafe/invites/index.ts` with real DB reads
8. Wire audit persistence: replace `emitAuditEvent` stub with Prisma write to `AihAuditEvent`
