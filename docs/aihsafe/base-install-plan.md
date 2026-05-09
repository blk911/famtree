# AIH Safe — Base Install Plan
**Agent 0 / Architect pass · 2026-05-09**

---

## Phase 0 — Scout & Contract (this pass, Agent 0)

**Status: Complete**

- [x] Inspect repo, produce scout report
- [x] Map existing auth, user, invite, trust surfaces
- [x] Identify naming collision risks
- [x] Adapt scaffold to repo convention (no `/src`)
- [x] Create `docs/aihsafe/` documentation set
- [x] Create `types/aihsafe/` shared primitive stubs
- [x] Create `lib/aihsafe/` service stubs (graph, governance, audit, invites, visibility)
- [x] Validate: no existing files modified, build still passes

**Deliverables:**
```
docs/aihsafe/scout-report.md
docs/aihsafe/file-ownership.md
docs/aihsafe/base-install-plan.md
docs/aihsafe/service-boundaries.md
docs/aihsafe/shared-primitives-draft.md
docs/aihsafe/agent-branch-plan.md
types/aihsafe/        (10 primitive type files)
lib/aihsafe/          (5 service stubs)
```

---

## Phase 1 — Core Graph (Agent 1, branch: `aihsafe-agent-1-core-graph`)

**Prerequisites:** Phase 0 complete, `aihsafe-foundation-contract` merged.

**Scope:**
- Design `FamilyUnit` Prisma model (additive, no existing model changes)
- Design `GuardianRelationship` Prisma model
- Design `AgeTier` field on `User` (or separate table if age policy requires isolation)
- Implement `lib/aihsafe/graph/` trust graph service (read-only queries first)
- Implement `lib/aihsafe/invites/` AIH Safe invite wrapper
- Add `prisma/schema.prisma` AIH Safe block (clearly commented, no existing model edits)
- Run `db:push` + `db:generate` + `typecheck`

**Do NOT in Phase 1:**
- Guardian permission enforcement
- UI
- Content moderation
- Notification logic

---

## Phase 2 — Governance (Agent 2, branch: `aihsafe-agent-2-governance`)

**Prerequisites:** Phase 1 complete and merged.

**Scope:**
- Implement `lib/aihsafe/governance/` guardian relationship service
- Implement `lib/aihsafe/audit/` typed audit event service (wraps `lib/activity/log.ts`)
- Implement `lib/aihsafe/visibility/` visibility scope resolver
- Define Zod schemas for all AIH Safe API input types
- Establish `app/api/aihsafe/` route namespace with first routes (family unit CRUD, guardian link)

**Do NOT in Phase 2:**
- UI flows
- Notification delivery
- Content feed logic
- Child account creation UI

---

## Phase 3 — UX Flow (Agent 3, branch: `aihsafe-agent-3-ux-flow`)

**Prerequisites:** Phase 2 complete.

**Scope:**
- `components/aihsafe/` — guardian onboarding, child profile setup, age gate UI
- Integrate visibility scope into existing `PostCard`, `TreeList`, `FamilyFeedClient`
- Parent approval modal for child actions
- Age-appropriate dashboard variant

---

## Phase 4 — Integration QA (Agent 4, branch: `aihsafe-agent-4-integration-qa`)

**Prerequisites:** Phase 3 complete.

**Scope:**
- End-to-end test scenarios (guardian invite → child account → content visibility)
- Load test trust graph queries
- Audit event completeness review
- Security review: age gate bypass scenarios, guardian impersonation
- Merge readiness checklist

---

## Constraints Across All Phases

1. Each phase delivers a passing `npm run build` before merge.
2. `npm run typecheck` must pass after every agent's work.
3. No phase may modify existing Prisma models — only add new models.
4. No phase may modify existing API routes — only add new routes under `app/api/aihsafe/`.
5. No phase may modify `middleware.ts` without architect sign-off.
6. All AIH Safe Prisma models must be in a clearly delimited block in `schema.prisma` with a comment header.
7. All new DB models use snake_case `@@map()` names prefixed `aih_` (e.g., `@@map("aih_family_units")`).
