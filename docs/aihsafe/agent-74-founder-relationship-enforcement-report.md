# Agent 74 — Child / Family Founder Relationship Enforcement Report

**Branch:** `aihsafe-agent-74-founder-relationship-enforcement`  
**Date:** 2026-05-19  
**Scope:** QA + hardening of Agent 73 invite-intent routing. No UI redesign, no new social features.

---

## Summary

Reviewed all seven mission scenarios against code paths. **Five bugs fixed** that could leak wrong relationship types (trusted-adult inversion, trust-unit on child register, teen/child DOB mismatch, trusted-adult minor registration, steward on trusted_adult intent). Added **`verify:invite-intent`** (32 checks) and **`inviteRegisterPolicy.ts`** for pure enforcement helpers.

---

## Files modified

| File | Change |
|------|--------|
| `lib/aihsafe/invites/inviteRegisterPolicy.ts` | **New** — TU pending policy, DOB/bracket checks, business/trusted-adult shape |
| `lib/aihsafe/invites/validateRegisterInvite.ts` | Delegates to policy helpers; teen/child DOB alignment |
| `lib/aihsafe/invites/materializeInviteOutcome.ts` | Fix trusted-adult inversion; minor always `parent` guardian; fail without steward |
| `lib/aihsafe/invites/invite-fields.ts` | `stewardUserId` only for child/teen (not trusted_adult invitee) |
| `app/api/auth/register/route.ts` | Skip TU pending resolution for child/teen/business intents |
| `scripts/aihsafe/verify-invite-intent-enforcement.ts` | **New** — automated QA |
| `package.json` | `verify:invite-intent` script |
| `docs/aihsafe/agent-74-founder-relationship-enforcement-report.md` | This report |

---

## Relationship flows tested

| # | Scenario | Expected | Result |
|---|----------|----------|--------|
| 1 | Adult friend (Spencer → Bill) | Sponsor bond only; no founder/guardian/family | **Pass** — `adult_friend` materialize no-op; TU pending allowed; `member` role |
| 2 | Child (Jane 12, steward declared) | Guardian + family unit + conservative policy | **Pass** (when DOB matches) — guardian `parent`, family unit, policy guarded |
| 3 | Teen | Same as child with TEEN tier | **Pass** — bracket/tier validation added |
| 4 | Trusted adult | Adult link only; no founder; no false minor | **Pass** (fixed) — no inverted guardian link on register |
| 5 | Business | TU member only; no family authority | **Pass** — no bond, no TU pending, no guardian |
| 6 | Unknown DOB | Conservative | **Pass** for non-invite; minor invite **requires DOB** |
| 7 | Family Safe visibility | Founder edits Msg Rules; child Boundaries read-only | **Pass** (seed + shell helpers) |
| 8 | Msg Vault governance | Minors governed via policy profile | **Pass** (seed child `requiresGuardianApproval`) |

---

## Bugs fixed

1. **Trusted-adult invite inversion** — `materializeInviteOutcome` created `guardian=steward, child=invitee`, treating the trusted adult as a minor. **Fix:** skip auto guardian link; links remain via People tab / `POST /api/aihsafe/guardian-links`.

2. **Child/teen trust-unit leakage** — `resolveTrustUnitPendingInvitesOnRegister` ran for all invites. **Fix:** only `adult_friend` / `family_adult` intents resolve TU pending slots.

3. **Child vs teen DOB mismatch** — Child invite could register with teen DOB. **Fix:** `validateInviteAgeBracketMatchesTier()` at registration.

4. **Trusted-adult minor registration** — No age gate. **Fix:** `validateTrustedAdultInviteeAge()` requires adult DOB.

5. **`stewardUserId` on trusted_adult invites** — Incorrectly set inviter as steward for minor materialization path. **Fix:** steward only for `child` / `teen` intents.

---

## Governance enforcement results

| Concern | Enforcement point |
|---------|-------------------|
| Invite ≠ site founder | `roleForInviteRegistration(false) → member` |
| Sponsor vs steward vs guardian | `inviteIntent` + `materializeInviteOutcome` branches |
| Child Boundaries | `applyMinorInvitePolicyDefaults` + `deriveShellMode → child` |
| Msg Rules edit | `canEditFamilyGovernance(founder shell + founder/admin role only)` |
| Business ≠ family | No guardian/family materialize; optional `targetTrustUnitId` only |

---

## Remaining gaps

| Gap | Notes |
|-----|-------|
| Trusted-adult invite → auto child link | Requires `targetChildUserId` on invite (future schema) or manual People tab |
| Trusted-adult send UI | No dedicated `/invite` category yet — API supports `trusted_adult` intent |
| `User.relationship` label | Still copied from invite tag; can read as “to founder” in tree |
| Site `founder` on first registrant | Global bootstrap unchanged — not invite-driven |
| End-to-end E2E | Verification is script + seed DB, not browser automation |
| Deferred guardian-approved minor invite | Approval `contextJson` may omit `stewardDeclaration` on old rows |

---

## Validation

| Command | Result |
|---------|--------|
| `npm run typecheck` | Pass |
| `npm run verify:invite-intent` | **32/32** (with `seed:aihsafe-scenarios:apply`) |
| `npx next build` | Pass |

---

## Manual smoke (recommended)

1. `/invite` → Adult + Frnd → send → register Bill → confirm `member`, bond only, no guardian row.  
2. `/invite` → Child or teen + steward checkbox → register with matching DOB → Family Safe **Boundaries** read-only.  
3. `/aihsafe` as founder-parent → **Msg Rules** editable.

---

## Related

- [agent-73-invite-intent-routing-report.md](./agent-73-invite-intent-routing-report.md)
- [agent-72-invite-intent-founder-audit.md](./agent-72-invite-intent-founder-audit.md)
