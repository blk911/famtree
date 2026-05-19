# AIH Safe + Msg Vault + Dashboard — Release Candidate Report

**Branch:** `aihsafe-agent-68-pre-merge-rc`  
**Base:** `main` (`a5b0a20`)  
**Date:** 2026-05-19  
**Agent:** 68 — Pre-Merge Stabilization / Release Candidate  
**Scope:** Stabilization and merge-readiness only — no new features, schema changes, or UI redesign.

---

## Executive summary

| Verdict | Detail |
|---------|--------|
| **Merge-ready** | **Conditional — not yet** |
| **Committed stack** | 9 commits ahead of `main` (Msg Vault 48–53, dashboard private-thread convergence 59–63) — **~110 files**, builds clean |
| **Uncommitted stack** | Agents **64–67** (Family Safe governance alignment, Members UI, relationship seed/verify, docs) — **must be committed** before merge review |
| **Out of RC scope** | Uncommitted **admin member-delete** debug (`AdminLists`, `delete-member-account.ts`, `waitlist/`) — **exclude** from this PR or land separately |

**Recommendation:** Squash or merge **one PR** containing: `main` → Msg Vault/convergence commits → committed Agents 64–67. Run manual QA checklist before production. Do not treat as production sign-off.

---

## 1. Feature inclusion matrix

| Workstream | Expected | Status | Location |
|------------|----------|--------|----------|
| Family Safe governance console | Tabs, role shells, surface split | **Partial** | **Committed:** shells on `main`; **uncommitted:** `FamilySafeTabs` (Policies & Settings label, `Family Safe navigation` aria) |
| Policy profiles / founder settings | `resolvePolicyProfile`, `FounderSettingsEditor` | **On `main`** | `lib/aihsafe/policy/*`, `app/api/aihsafe/founder-settings` |
| Minor post escalation | `ACTIVITY_POST_PENDING` approval path | **On `main`** | `app/api/aihsafe/activity/route.ts`, Agent 45 docs |
| Dashboard vault consolidation | Private threads → Msg Vault APIs | **Committed** (9 commits) | `components/dashboard/DashboardPrivateThreadCenter.tsx`, `DashboardVaultTabs`, Agent 31/59–63 docs |
| Msg Vault schema / routes / UI | Conversations, messages, notices | **Committed** | `app/api/msg-vault/*`, `components/msg-vault/*`, `lib/msg-vault/*` |
| Private thread convergence | Shared model, dedupe, migration scripts | **Committed** | `lib/private-thread-keys.ts`, `scripts/msg-vault/migrate-legacy-private-posts.ts` |
| Relationship test harness | Dev seed script | **Uncommitted** | `scripts/aihsafe/seed-relationship-scenarios.ts`, `package.json` scripts |
| Relationship scenario QA | Verify script + report | **Uncommitted** | `scripts/aihsafe/verify-relationship-scenarios.ts`, `docs/aihsafe/agent-67-*` |
| Members governance UI (Agent 65) | Guardian/trusted-adult link modal | **Uncommitted** | `PeopleTab`, `GuardianLinkModal`, `apiClient.createGuardianLink` |

### Commits ahead of `main` (Msg Vault + convergence)

```
636936d QA vault convergence layout repairs
b59af1d Converge dashboard private threads with Msg Vault
e8893c7 Unify private thread selector model
dca17e9 Add Msg Vault notices MVP
a1d504e feat(msg-vault): Agent 52 direct chat start flow
da58445 feat(msg-vault): Agent 51 governed communication UI shell
3aa62bf feat(msg-vault): Agent 50 governed conversations API and services
d9a2ebd feat(msg-vault): Agent 49 schema and type contracts foundation
66d0297 docs(msg-vault): Agent 48 governed communication architecture
```

---

## 2. Validation results

| Command | Result | Notes |
|---------|--------|-------|
| `npm run typecheck` | **Pass** | |
| `npx next build` | **Pass** | After stopping stray `node` processes and deleting `.next` |
| `npm run build` | **Flaky** | `EPERM` on Prisma engine rename if another process holds lock; use `npx next build` when `prisma generate` already current |
| `npm run verify:aihsafe-scenarios` | **29/29 pass** | Requires `npm run seed:aihsafe-scenarios:apply` on dev DB |

**Build flake:** Intermittent `PageNotFoundError: /_document` when multiple Node/dev servers run concurrently — environmental (App Router only; no `pages/` dir).

---

## 3. Stabilization audit

### Dead / unused code

| Item | Finding |
|------|---------|
| `lib/msg-vault/stub.ts` | **Unused** in app (Agent 49 placeholder); safe to delete post-merge, not removed in RC |
| AIH Safe / Msg Vault `console.log` | **None** in `components/aihsafe`, `lib/aihsafe`, `lib/msg-vault`, `app/(app)/msg-vault` |

### Nav labels & links

| Check | Result |
|-------|--------|
| Family Safe tab aria | `Family Safe navigation` (fixed Agent 64, uncommitted) |
| Settings tab label | `Policies & Settings` (uncommitted) |
| Sidebar | `/dashboard`, `/msg-vault`, `/aihsafe` — routes exist; middleware protects all three |
| Admin founders | Dashboard link → `/admin` (intentional) |

### Dev-only leakage

| Surface | Guard |
|---------|--------|
| `seed:aihsafe-scenarios*` | CLI only; blocks `NODE_ENV=production` unless `ALLOW_AIHSAFE_SCENARIO_SEED=1` |
| `verify:aihsafe-scenarios` | CLI only; no app import |
| `migrate:private-posts*` | CLI only |
| App routes | **No** seed/verify hooks in `app/` |

### Docs present

| Area | Key docs |
|------|----------|
| Msg Vault | `docs/msg-vault/msg-vault-architecture.md`, route map, Agent 48–63 reports |
| Policy | `docs/aihsafe/policy-resolution-flow.md`, Agent 36–46, `minor-post-approval-flow.md` |
| Dashboard | Agent 31, 55–56, convergence roadmap |
| Agents 64–67 | `docs/aihsafe/agent-64-*` … `agent-67-*`, `relationship-scenario-test-plan.md` |
| **This RC** | `docs/release/*` (this file, `known-gaps.md`, `manual-qa-checklist.md`) |

---

## 4. Files modified (Agent 68 session)

### Created (release docs only)

- `docs/release/aihsafe-msgvault-rc-report.md`
- `docs/release/known-gaps.md`
- `docs/release/manual-qa-checklist.md`

### Pre-existing on branch (not committed by Agent 68)

See `git status` — Agents 64–67 + optional admin debug. **Agent 68 did not commit application code.**

---

## 5. Merge readiness

| Criterion | Status |
|-----------|--------|
| Typecheck | ✅ |
| Production build | ✅ (with clean `.next`, single Node) |
| Automated relationship QA | ✅ (dev DB) |
| All RC workstreams in git | ❌ — 64–67 uncommitted |
| Manual QA checklist | ❌ — not executed in browser this pass |
| Production sign-off | ❌ |

### Blockers before merge

1. **Commit** Agents 64–67 files (governance tabs, Members UI, seed/verify scripts, agent docs).
2. **Exclude or split** admin member-delete debug from the RC PR.
3. **Manual QA** — at minimum founders + child + Msg Vault send path (see checklist).
4. **Optional:** Run `npm run migrate:private-posts` on target staging DB before enabling vault UI.

### Post-merge tasks

- Guardian-link **revoke** API + enable Remove in Members UI
- Enforce category allowlist + `allowMinorExternalLinks` on activity POST (Agent 44 gaps)
- Remove `lib/msg-vault/stub.ts` if still unused
- Production migration runbook for legacy private posts
- Browser E2E for relationship scenarios

---

## 6. Related agent reports

| Agent | Report |
|-------|--------|
| 64 | `docs/aihsafe/agent-64-family-safe-governance-alignment-report.md` |
| 65 | `docs/aihsafe/agent-65-members-governance-ui-report.md` |
| 66 | `docs/aihsafe/agent-66-relationship-test-harness-report.md` |
| 67 | `docs/aihsafe/agent-67-relationship-scenario-qa-report.md` |
| 63 | `docs/msg-vault/agent-63-vault-convergence-qa-report.md` |
| 44 | `docs/aihsafe/agent-44-policy-enforcement-qa-report.md` |
