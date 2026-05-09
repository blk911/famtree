# AIH Safe — Agent 3 Implementation Report
**Agent 3 · Persistence + Graph Implementation · 2026-05-09**

---

## 1. Files Touched

| File | Action |
|---|---|
| `prisma/schema.prisma` | Modified — added AIH Safe back-relations to `User` and `TrustUnit`; appended full AIH Safe models block |
| `lib/aihsafe/graph/index.ts` | Modified — replaced 7 stubs with real Prisma queries |
| `lib/aihsafe/audit/index.ts` | Modified — wired `emitAuditEvent` to `aih_audit_events`; implemented `getAuditEventsForTarget` |
| `lib/aihsafe/index.ts` | Modified — added `context` and `mappers` barrel exports |
| `lib/aihsafe/mappers/prisma-to-aihsafe.ts` | Created — all Prisma → AIH Safe DTO conversions and branded ID casts |
| `lib/aihsafe/mappers/index.ts` | Created — barrel export |
| `lib/aihsafe/context/buildActorContext.ts` | Created — full `ActorContext` assembly from user ID |
| `lib/aihsafe/context/index.ts` | Created — barrel export |
| `docs/aihsafe/service-boundaries.md` | Modified — updated graph/audit status; added §11 Context, §12 Mappers, cross-service rule 8+9 |
| `docs/aihsafe/agent-3-implementation-report.md` | Created — this file |

---

## 2. Prisma Schema Changes Applied

**Back-relations added to existing `User` model:**
```
aihFamilyUnitsCreated      AihFamilyUnit[]           @relation("AihFamilyUnitCreatedBy")
aihFamilyUnitMemberships   AihFamilyUnitMember[]     @relation("AihFamilyUnitMember")
aihGuardianRelationships   AihGuardianRelationship[] @relation("AihGuardianOf")
aihGuardedByRelationships  AihGuardianRelationship[] @relation("AihChildOf")
aihApprovalRequestsMade    AihApprovalRequest[]      @relation("AihApprovalRequestor")
aihApprovalRequestsPending AihApprovalRequest[]      @relation("AihApprovalApprover")
```

**Back-relation added to existing `TrustUnit` model:**
```
aihMeta AihTrustUnitMeta?
```

**New models added (all additive, all `@@map("aih_*")`):**
- `AihTrustUnitMeta` → `aih_trust_unit_meta` (1:1 sidecar for existing TrustUnit)
- `AihFamilyUnit` → `aih_family_units`
- `AihFamilyUnitMember` → `aih_family_unit_members`
- `AihGuardianRelationship` → `aih_guardian_relationships`
- `AihApprovalRequest` → `aih_approval_requests`
- `AihAuditEvent` → `aih_audit_events`

**New enums added:**
- `AihGuardianKind`, `AihGuardianPermLevel`, `AihFamilyUnitStatus`, `AihFamilyMemberRole`, `AihTrustUnitKind`, `AihApprovalState`

**No existing model, field, or enum was removed or renamed.**

---

## 3. Commands Run

```
npm run db:push     → ✅ "Your database is now in sync with your Prisma schema. Done in 224ms"
npm run typecheck   → ✅ (zero errors, two passes)
npm run build       → ✅ "Compiled successfully" — 68 pages, all existing routes intact
```

---

## 4. Validation Results

| Check | Result |
|---|---|
| `db:push` | Passed — 6 new tables created, 0 existing tables modified |
| `typecheck` | Passed — zero TypeScript errors |
| `build` | Passed — "Compiled successfully", zero new route errors |
| Existing routes changed | No — all existing routes identical to before |
| New routes created | No |
| UI created | No |

Build warnings (pre-existing, not new):
- Dynamic server usage (`cookies`) warnings on authenticated pages — existed before Agent 3.

---

## 5. DB Push Status

Database: **local PostgreSQL** (`localhost:5432`, database `famtree`).
`db:push` ran successfully — additive schema applied with no data loss.

Production DB: **not touched**. To apply to Neon production, set `DATABASE_URL` to the production
connection string and run `npm run db:push`. See `docs/aihsafe/migration-plan.md` for the full
production push protocol.

---

## 6. Graph Functions Implemented

| Function | Status | Notes |
|---|---|---|
| `getTrustUnitById` | ✅ Real Prisma query | Includes `members` + `aihMeta` joins |
| `listTrustUnitsForUser` | ✅ Real Prisma query | Filters by `members.some({ userId })` |
| `listMembershipsForUser` | ✅ Real Prisma query | Queries `TrustUnitMember` directly |
| `listMembersForTrustUnit` | ✅ Real Prisma query | Queries `TrustUnitMember` by `trustUnitId` |
| `getGuardianRelationshipsForChild` | ✅ Real Prisma query | Queries `AihGuardianRelationship` |
| `getGuardianRelationshipsForGuardian` | ✅ Real Prisma query | Queries `AihGuardianRelationship` |
| `listRelationshipEdgesForUser` | ✅ Phase 3 proxy | Reads from `ConnectionRequest`; Phase 4 replaces with `aih_relationship_edges` |
| `assertGraphShape` | ✅ Unchanged | Pure type assertion, no Prisma |

**Known limitations in Phase 3:**
- `TrustUnitMembership.role` always returns `"member"` — existing `TrustUnitMember` has no `role` column. Phase 4 migration adds the column.
- `TrustUnitMembership.exitedAt` always returns `null` — existing `TrustUnitMember` has no `exitedAt` column. Phase 4 migration adds the column.
- `TrustUnit.kind` returns `"peer"` when no `AihTrustUnitMeta` sidecar exists (older TrustUnits).

---

## 7. Audit Functions Implemented

| Function | Status | Notes |
|---|---|---|
| `createAuditEventDraft` | ✅ Unchanged | Pure, synchronous — still returns `AuditEventDraft` with `_persistenceDeferred: true` |
| `emitAuditEvent` | ✅ Now writes to DB | Prisma `aihAuditEvent.create` → returns `AuditEventEnvelope` with real `id` |
| `getAuditEventsForTarget` | ✅ Now queries DB | `findMany` by `targetId`, ordered `createdAt DESC`, limit 200 max |

---

## 8. Context Builder Status

`lib/aihsafe/context/buildActorContext.ts` — **fully implemented**.

- Fetches `User` (id, role, status, dateOfBirth only — never exposes passwordHash)
- Throws if user not found or not `active`
- Runs graph reads in parallel (`Promise.all`)
- Derives `ageTier` via `deriveAgeTier(dateOfBirth)`
- Derives `familySafeRole` via `deriveFamilySafeRole(ageTier, guardianRelationships)`
- Returns fully typed `ActorContext`

---

## 9. Existing Behavior Changed

**No.** Zero existing routes modified. Zero existing components modified. Zero existing Prisma models altered. The `build` output is identical to pre-Agent-3 except for the new tables now existing in the schema output.

---

## 10. Remaining Gaps

| Gap | Phase | Notes |
|---|---|---|
| `TrustUnitMember.role` column | Phase 4 | Add `role AihTrustUnitRole @default(member)` to existing model |
| `TrustUnitMember.exitedAt` column | Phase 4 | Add `exitedAt DateTime?` to existing model |
| Dedicated `aih_relationship_edges` table | Phase 4 | Replace `ConnectionRequest` proxy in `listRelationshipEdgesForUser` |
| Invite service implementation | Phase 4 | `lib/aihsafe/invites/` stubs not yet implemented |
| `AihFamilyUnit` graph queries | Phase 4 | No `listFamilyUnitsForUser` or `getFamilyUnitById` yet |
| Production DB push | Ops | Must be done manually with production `DATABASE_URL` |

---

## 11. Next Recommended Agent

**Agent 4 — API Routes**: Implement the route handlers defined in `docs/aihsafe/api-topology.md`.

Recommended order:
1. `POST /api/aihsafe/guardian-links` — create guardian relationship
2. `GET /api/aihsafe/guardian-links` — list relationships
3. `POST /api/aihsafe/family` — create family unit
4. `GET /api/aihsafe/approvals` — guardian inbox
5. `POST /api/aihsafe/approvals/[id]/approve` and `/deny`
6. `POST /api/aihsafe/trust-units` + `GET /api/aihsafe/trust-units`
7. `POST /api/aihsafe/memberships` + `DELETE`
8. `POST /api/aihsafe/invites`

Each route must:
- Call `requireAuth()` from `lib/auth`
- Call `buildActorContext(asAIHUserId(user.id))`
- Call the appropriate governance gate
- Emit audit event via `emitAuditEvent`
- Return the normalized envelope from `types/aihsafe/api-responses.ts`
- Follow the mutation boundary table in `docs/aihsafe/mutation-boundaries.md`
