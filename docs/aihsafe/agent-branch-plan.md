# AIH Safe — Agent Branch Plan
**Agent 0 / Architect pass · 2026-05-09**

---

## Branch Hierarchy

```
main
└── aihsafe-base-scaffold
    └── aihsafe-agent-0-scout           ← this branch (Agent 0 deliverables)
        └── aihsafe-foundation-contract  ← merge point: Agent 0 reviewed + approved
            ├── aihsafe-agent-1-core-graph
            └── aihsafe-agent-2-governance
                └── aihsafe-agent-3-ux-flow
                    └── aihsafe-agent-4-integration-qa
```

---

## Branch Descriptions

### `aihsafe-base-scaffold`
**Owner:** Architect / Agent 0
**Base:** `main` (or `recovery-famtree-trust-units-working` if that is the current working branch)
**Purpose:** Parent branch for all AIH Safe work. Never pushed to production directly.
**Merge rule:** Only `aihsafe-agent-4-integration-qa` may merge into this, after QA sign-off.

---

### `aihsafe-agent-0-scout`
**Owner:** Agent 0 (this pass)
**Base:** `aihsafe-base-scaffold`
**Purpose:** Scout report, docs, shared primitive types, service stubs.
**Deliverables:**
- `docs/aihsafe/` (6 files)
- `types/aihsafe/` (10 files)
- `lib/aihsafe/` (5 stub files)
**Acceptance:** `npm run typecheck` passes. `npm run build` passes. Zero existing files modified.

---

### `aihsafe-foundation-contract`
**Owner:** Architect
**Base:** `aihsafe-agent-0-scout` (after review)
**Purpose:** Merge point and contract freeze. After this branch is cut, the types in
`types/aihsafe/` become a stable interface — changes require architect sign-off.
**Deliverables:** None — just a merge commit + tag.

---

### `aihsafe-agent-1-core-graph`
**Owner:** Agent 1
**Base:** `aihsafe-foundation-contract`
**Purpose:** Trust graph service implementation + AIH Safe Prisma schema additions.
**Key files:**
- `lib/aihsafe/graph/index.ts` (implement)
- `lib/aihsafe/invites/index.ts` (implement)
- `prisma/schema.prisma` (add AIH Safe block — no existing model edits)
**Acceptance:** `npm run db:push`, `npm run typecheck`, `npm run build` all pass.

---

### `aihsafe-agent-2-governance`
**Owner:** Agent 2
**Base:** `aihsafe-agent-1-core-graph`
**Purpose:** Guardian governance, audit, visibility services + first API routes.
**Key files:**
- `lib/aihsafe/governance/index.ts` (implement)
- `lib/aihsafe/audit/index.ts` (implement)
- `lib/aihsafe/visibility/index.ts` (implement)
- `app/api/aihsafe/` (first routes)
**Acceptance:** `npm run typecheck`, `npm run build` pass. Manual smoke test of first API routes.

---

### `aihsafe-agent-3-ux-flow`
**Owner:** Agent 3
**Base:** `aihsafe-agent-2-governance`
**Purpose:** Guardian onboarding UI, child profile setup, age gate components.
**Key files:**
- `components/aihsafe/` (new)
- Integration into `AppShell`, `FamilyFeedClient`, `PostCard`
**Acceptance:** Dev server runs, golden path UX works, no regressions in existing flows.

---

### `aihsafe-agent-4-integration-qa`
**Owner:** Agent 4
**Base:** `aihsafe-agent-3-ux-flow`
**Purpose:** End-to-end QA, security review, merge readiness.
**Acceptance:** All validation commands pass. Security checklist complete. Architect approved.

---

## Merge Rules

1. Each branch merges **forward only** — never back-merge except for hotfixes, which must be explicitly approved.
2. Before any merge, run: `npm run typecheck && npm run build`.
3. No branch may merge if it modifies a file owned by `[EXISTING]` (see `file-ownership.md`) without architect approval documented in the PR description.
4. `aihsafe-foundation-contract` is the stability gate — all downstream agents pull from it, not from `aihsafe-agent-0-scout`.

---

## Handoff Prompt Template for Agent 1

```
You are Agent 1 for the AIH Safe system (Core Graph).

Read these files before writing any code:
- docs/aihsafe/scout-report.md
- docs/aihsafe/file-ownership.md
- docs/aihsafe/service-boundaries.md
- docs/aihsafe/shared-primitives-draft.md
- docs/aihsafe/base-install-plan.md

Branch: aihsafe-agent-1-core-graph (based on aihsafe-foundation-contract)

Your task: Implement lib/aihsafe/graph/index.ts and lib/aihsafe/invites/index.ts,
and add AIH Safe Prisma models to prisma/schema.prisma (additive only, clearly
delimited block, all @@map() names prefixed "aih_").

Do NOT implement:
- Guardian permission enforcement
- UI components
- Notification delivery
- Content moderation

Acceptance criteria:
- npm run db:push passes
- npm run typecheck passes
- npm run build passes
- Zero existing files modified
```
