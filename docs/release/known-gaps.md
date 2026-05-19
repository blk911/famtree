# Known Gaps — AIH Safe + Msg Vault RC

**Updated:** 2026-05-19 (Agent 68)  
**Applies to:** `aihsafe-agent-68-pre-merge-rc` stack vs `main`

---

## P0 — Merge / release blockers

| Gap | Impact | Workaround |
|-----|--------|------------|
| Agents 64–67 changes **uncommitted** | Merge PR missing governance Members UI, seed harness, nav fixes | Commit before opening PR |
| Admin member-delete debug in working tree | Scope creep, untested in RC | Omit from RC PR |
| No full manual browser QA on RC branch | UX/regression risk | Run [manual-qa-checklist.md](./manual-qa-checklist.md) |

---

## P1 — Governance & policy (documented, not fixed in RC)

| Gap | Detail |
|-----|--------|
| No guardian-link **revoke** API | Members UI Remove disabled; links persist until DB/manual fix |
| Guardian assignee = current user only | Second guardian must sign in to create their own link |
| Category allowlist | Stored client-side; **not** enforced on `POST /api/aihsafe/activity` |
| `allowMinorExternalLinks` | Policy flag exists; not enforced on post body |
| UNKNOWN DOB tier | Conservative defaults; some legacy governance paths may still be permissive (see Agent 37/44) |
| Teen `posting.requiresGuardianApproval` vs escalation | Escalation path is correct for posts; naming may confuse QA |

---

## P2 — Msg Vault & dashboard

| Gap | Detail |
|-----|--------|
| Legacy private post migration | Dev script only; production DB needs runbook + `migrate:private-posts:apply` when ready |
| `lib/msg-vault/stub.ts` | Unused placeholder from Agent 49 |
| Dashboard vs Msg Vault duplicate entry points | Intentional convergence; two UIs same backend — verify no duplicate TU threads (Agent 63 dedupe fix) |
| Mobile layout | CSS reviewed; limited device QA |
| Font fetch during build | Google Fonts network blip can slow/retry build (non-blocking) |

---

## P3 — Dev / ops

| Gap | Detail |
|-----|--------|
| Windows `.next` corruption | Multiple `next dev` → chunk / `_document` errors; stop Node, delete `.next` |
| `npm run build` EPERM | Prisma DLL locked if dev server running |
| Scenario seed in production | Blocked by default; never set `ALLOW_AIHSAFE_SCENARIO_SEED=1` on prod without approval |
| Prisma query logging | `lib/db/prisma.ts` logs queries in development only |

---

## Explicitly out of scope for this RC

- Prisma schema changes
- New product features
- UI redesign
- Exposing dev scripts in production UI
- Automated Playwright/Cypress E2E suite

---

## Reference docs

- Policy enforcement matrix: `docs/aihsafe/policy-enforcement-matrix.md`
- Policy gaps: `docs/aihsafe/policy-profile-gap-map.md`
- Bug list (historical): `docs/aihsafe/bug-list.md`
- Relationship QA: `docs/aihsafe/agent-67-relationship-scenario-qa-report.md`
