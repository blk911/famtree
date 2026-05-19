# Agent 67 — Relationship Scenario QA Report

**Branch:** `aihsafe-agent-67-relationship-scenario-qa`  
**Date:** 2026-05-19  
**Scope:** QA pass on Agent 66 seeded scenarios. No product features, no schema changes, no production exposure.

---

## Executive summary

Agent 66 seed data was applied to the dev database and validated with a new read-only verification script plus code-path review. **Core relationship scenarios pass** at the policy/API layer. **No permission or role-view bugs** required product fixes in this pass. Remaining gaps are **known pre-existing** items (revoke guardian link, teen vs child posting copy, full E2E browser matrix).

**Readiness:** Suitable for **manual dev QA** and continued governance work; not a production sign-off.

---

## QA method

| Layer | Tool |
|---|---|
| Data | `npm run seed:aihsafe-scenarios:apply` |
| Automated | `npm run verify:aihsafe-scenarios` (29 checks) |
| Code review | Activity POST, Msg Vault `canMessage`, shell tabs, dashboard grep |
| Browser | Not run in CI — manual matrix in [relationship-scenario-test-plan.md](./relationship-scenario-test-plan.md) |

**Login:** `RelationshipTest1!` for all `@famtree.test` scenario accounts.

---

## Scenarios tested

### 1. Parent → Child

| Check | Result | Evidence |
|---|---|---|
| Guardian link seeded | **Pass** | founder-parent → child |
| Child age tier / shell | **Pass** | `child` tier, shell `child`, tabs `spaces,activity` |
| Posting allowed + escalation flag | **Pass** | `allowMinorPosting=true`, `requiresGuardianApprovalForPostContent=true` |
| Activity POST escalation path | **Pass** | `app/api/aihsafe/activity/route.ts` creates `AihApprovalRequest` when escalation required |
| Child pending UI | **Pass** (code) | `ChildEscalationStatus` + `listMyEscalations` on child Overview |
| Guardian inbox | **Pass** (code) | `GuardianInbox` + `PendingAttention` for approvers |
| Child blocked DM to CEO | **Pass** | `canMessage` denied without shared TU |
| Child DM to parent in family TU | **Pass** | `canMessage` allowed with shared TU |
| Private thread restrictions | **Pass** (code) | `createThreadConversation` requires TU membership + `enablePrivateThreads` |

**Manual follow-up:** Log in as child, create Activity post → expect 202/pending; log in as founder-parent/guardian → Approvals tab.

---

### 2. Parent → Teen

| Check | Result | Evidence |
|---|---|---|
| Guardian link | **Pass** | founder-parent → teen |
| Teen tier / shell | **Pass** | `teen` tier, **child** shell (minor UI) |
| Teen escalation policy | **Pass** | `isMinorTier(TEEN)` → `requiresGuardianApprovalForPostContent=true` |
| Teen direct chat rules | **Pass** (code) | Same `canMessage` minor rules; shared TU with family circle |
| Approval notices | **Pass** (code) | Msg Vault notices API + approval action kinds |

**Note:** `posting.requiresGuardianApproval` is `false` for TEEN in `postingDefaults`, but **activity route uses `escalation.requiresGuardianApprovalForPostContent`**, which is `true` for all minor tiers — correct for QA intent.

---

### 3. Trusted Adult

| Check | Result | Evidence |
|---|---|---|
| `enableTrustedAdults` | **Pass** | Founder settings singleton |
| Steward → trusted-adult link | **Pass** | `kind=trusted_adult` |
| Trusted adult shell | **Pass** (code) | Adult `member` shell (not founder); no steward controls |
| Thread access | **Pass** (code) | Governed by TU membership + `canMessage`; no special trusted-adult Msg Vault role |
| Blocked when disabled | **Pass** (code) | `POST /api/aihsafe/guardian-links` rejects `trusted_adult` when flag off |

**Manual follow-up:** Toggle `enableTrustedAdults` off in Policies & Settings → confirm new trusted-adult link fails with friendly message.

---

### 4. Business hierarchy (CEO / CFO / Employee)

| Check | Result | Evidence |
|---|---|---|
| Business trust unit seeded | **Pass** | Scenario Executive Team |
| CEO → CFO `canMessage` | **Pass** | Allowed, shared TU |
| CFO in CEO allowed contacts | **Pass** | `listAllowedChatContacts` |
| CEO ↔ employee shared TU | **Pass** | Same business unit |
| Non-member restricted thread | **Pass** (code) | `createThreadConversation` rejects participants not in TU |

**Manual follow-up:** CEO starts direct chat to CFO in Msg Vault; employee cannot add outsider to thread.

---

### 5. Unknown DOB user

| Check | Result | Evidence |
|---|---|---|
| Scenario user | **Pass** (after Agent 67 seed add) | `unknown-dob@famtree.test`, `dateOfBirth: null` |
| Tier | **Pass** | `UNKNOWN` |
| Shell | **Pass** | `member` (not founder) |
| Conservative invites | **Pass** | `invite.allowed=false`, `dailyInviteLimit=0` |
| Visibility | **Pass** (code) | `visibilityDefaults(UNKNOWN)` — family scope, not discoverable |

---

### 6. Dashboard / Msg Vault / Family Safe split

| Surface | Expected | Result |
|---|---|---|
| Dashboard | Awareness, feed, private-thread hub, CTAs to vault | **Pass** (code) — no `FounderSettingsEditor` in dashboard components |
| Msg Vault | Communication, `canMessage`, notices | **Pass** (code) |
| Family Safe | Governance tabs, Members, Policies, Approvals | **Pass** — founder tabs include settings + approvals |

---

## Automated verification summary

```
npm run verify:aihsafe-scenarios
→ 29/29 checks passed
```

---

## Bugs fixed (this branch)

| Change | Why |
|---|---|
| `scripts/aihsafe/seed-relationship-scenarios.ts` — add `unknown-dob@famtree.test` | Scenario 5 could not be tested without a null-DOB user |
| `scripts/aihsafe/verify-relationship-scenarios.ts` — **new** | Repeatable QA signal for Agent 67+ |
| `package.json` — `verify:aihsafe-scenarios` | Developer ergonomics |

**No application UI/API logic changes** in this pass.

---

## Remaining blockers (pre-existing)

| Item | Impact |
|---|---|
| No guardian-link **revoke** API | Remove button disabled in Members UI (Agent 65) |
| Assign guardian B → child C requires B to sign in | API sets actor as guardian only |
| Category allowlist localStorage-only | Not enforced on activity POST |
| `allowMinorExternalLinks` not enforced on posts | Policy gap (Agent 44) |
| Full browser E2E not automated | Manual QA still required |
| Dev `.next` cache fragility | Environmental; clear `.next` when chunks missing |

---

## Readiness assessment

| Area | Status |
|---|---|
| Scenario seed reproducibility | **Ready** (`seed:aihsafe-scenarios:apply`) |
| Policy + messaging gates | **Ready for dev QA** |
| Guardian approval E2E | **Ready to manual-test** (API wired) |
| Production | **Not in scope** — test accounts are dev-only |

---

## Validation results

| Command | Result |
|---|---|
| `npm run verify:aihsafe-scenarios` | **29/29 pass** |
| `npm run typecheck` | **Pass** |
| `npx next build` | **Pass** (after stopping stray `node` / dev servers and deleting `.next`; first attempt failed with `PageNotFoundError` for `/_document` — environmental) |

---

## Files touched (Agent 67)

| File | Action |
|---|---|
| `scripts/aihsafe/verify-relationship-scenarios.ts` | Created |
| `scripts/aihsafe/seed-relationship-scenarios.ts` | Added `unknown-dob@famtree.test` |
| `package.json` | `verify:aihsafe-scenarios` script |
| `docs/aihsafe/agent-67-relationship-scenario-qa-report.md` | This report |
