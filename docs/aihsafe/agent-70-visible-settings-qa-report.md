# Agent 70 — Visible Governance Settings QA Report

**Branch:** `aihsafe-agent-70-visible-settings-qa`  
**Date:** 2026-05-19  
**Scope:** QA of Agent 69 visible Family Safe settings (no new features).

---

## Executive summary

Automated QA (**27/27** visible-governance checks, **30/30** relationship scenario checks after tab fix) confirms tab visibility, read-only vs edit gating, and policy/family-settings alignment for seeded roles. **No unauthorized save path** for non-founders (PATCH remains founder/admin-only). Small copy and lock-indicator fixes applied. Browser pass recommended for founder save/refresh.

---

## Roles tested

| Role | Tab | Panel | Edit | Automated |
|------|-----|-------|------|-----------|
| **Founder/Admin** | Policies & Settings | `FounderSettingsEditor` | Yes | ✅ tabs, canEdit |
| **Guardian** | Policies & Settings | `FamilySettingsView` | No | ✅ tabs incl. Approvals |
| **Adult member** | Policies & Settings | `FamilySettingsView` | No | ✅ tabs, no Approvals |
| **Teen** | Family Settings | `FamilySettingsView` | No | ✅ child shell + settings tab |
| **Child** | Family Settings | `FamilySettingsView` | No | ✅ + steward copy |
| **UNKNOWN DOB** | Policies & Settings | `FamilySettingsView` | No | ✅ member shell, locked |

---

## Test matrix results

### 1. Founder/Admin

| Check | Result |
|-------|--------|
| Sees Policies & Settings tab | **Pass** |
| `canEditFamilyGovernance` | **Pass** |
| PATCH `/api/aihsafe/founder-settings` | **Pass** (code — founder-only) |
| Save persists after refresh | **Not automated** — manual smoke recommended |

### 2. Guardian

| Check | Result |
|-------|--------|
| Sees Policies & Settings + Approvals | **Pass** |
| Read-only panel, no toggles | **Pass** (no `role=switch` in `FamilySettingsView`) |
| PATCH blocked | **Pass** (API 403 for non-founder) |

### 3. Adult member

| Check | Result |
|-------|--------|
| Settings tab, no Approvals | **Pass** |
| Read-only + steward banner | **Pass** |

### 4. Teen / Child

| Check | Result |
|-------|--------|
| Settings tab on child shell | **Pass** |
| Friendly minor intro copy | **Pass** (code review) |
| No edit controls | **Pass** |
| Lock indicator banner | **Pass** (added in QA) |

### 5. UNKNOWN age

| Check | Result |
|-------|--------|
| `member` shell (not founder) | **Pass** |
| Settings visible, `canEdit` false | **Pass** |

### 6. Enforcement consistency

| Displayed field | Enforced? | QA |
|-----------------|-----------|-----|
| Minor posting (family ↔ child policy) | Yes | **Pass** — aligned |
| Guardian approval (teen/child escalation) | Yes | **Pass** |
| Private trusted spaces (family flag) | Yes (Msg Vault / TU paths) | **Pass** flag |
| Trusted adults (family flag) | Yes (guardian-links API) | **Pass** flag |
| Default visibility | Yes (activity route) | **Pass** (code review) |
| External links (minors) | **Partial** | Display notes “where supported”; not enforced on activity POST |
| Interest categories | **Not server-backed** | Omitted from list; footnote only |
| `allowMinorInvites` (family) | Yes (invites route) | Not shown in read-only UI (founder editor only) |

---

## Bugs fixed (Agent 70)

| Fix | File |
|-----|------|
| Child/teen tab QA expected old tab set without `settings` | `scripts/aihsafe/verify-relationship-scenarios.ts` |
| Guardian/member tab label → **Policies & Settings** (child keeps **Family Settings**) | `components/aihsafe/roles/governanceView.ts` |
| Read-only lock banner + clearer external-links label | `components/aihsafe/founder/FamilySettingsView.tsx` |
| New automated QA script | `scripts/aihsafe/verify-visible-governance-settings.ts` |
| npm script `verify:visible-governance` | `package.json` |

---

## Settings / enforcement mismatches (documented, not fixed)

| Gap | Notes |
|-----|--------|
| External links in posts | Shown for transparency; enforcement gap per Agent 44 |
| Category allowlist | localStorage-only; not listed in read-only view |
| `privateThreadsEnabled` in personal DTO | Reflects family flag, not per-user override |

---

## Validation

| Command | Result |
|---------|--------|
| `npm run verify:visible-governance` | **27/27 pass** (after `seed:aihsafe-scenarios:apply`) |
| `npm run verify:aihsafe-scenarios` | **30/30 pass** |
| `npm run typecheck` | **Pass** |
| `npx next build` | **Pass** |

---

## Manual smoke (recommended)

1. **founder@famtree.test** / `password123` or scenario founder — toggle **Allow minor posting** off → save → refresh → still off.  
2. **child@famtree.test** / `RelationshipTest1!` — open **Family Settings** — confirm 🔒 banner, no toggles.  
3. **guardian@famtree.test** — confirm **Policies & Settings** + Approvals, read-only settings.

---

## Files modified

- `scripts/aihsafe/verify-visible-governance-settings.ts` (new)
- `scripts/aihsafe/verify-relationship-scenarios.ts`
- `components/aihsafe/roles/governanceView.ts`
- `components/aihsafe/founder/FamilySettingsView.tsx`
- `package.json`
- `docs/aihsafe/agent-70-visible-settings-qa-report.md`

---

## Readiness

**Ready for merge** from a code/QA perspective. Founder save/refresh and mobile layout are the remaining manual checks.
