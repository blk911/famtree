# Agent 76 — Real Relationship Simulation Report

**Branch:** `aihsafe-agent-76-real-relationship-simulation`  
**Date:** 2026-05-19  
**Method:** Lived-flow simulation using Agent 66 seed accounts (`npm run seed:aihsafe-scenarios:apply`), programmatic scenario verification, and targeted code-path review across Family Safe, Dashboard, and Msg Vault. Password for scenario users: `RelationshipTest1!`.

---

## 1. Flows tested

| # | Scenario | Accounts / data | What was exercised |
|---|----------|-----------------|-------------------|
| 1 | **Parent + child** | `founder-parent@`, `child@`, `guardian@` | Guardian links (parent→child), child shell (`Boundaries` tab), minor posting + guardian approval flags, child→parent DM allowed, child→CEO blocked, Approvals tab for guardians |
| 2 | **Parent + teen** | `teen@` | Teen tier + child shell, same tab set as child (`spaces`, `activity`, `settings`), escalation policy on posts |
| 3 | **Adult friend** | `peer@` (peer pod TU) | Member shell (not founder), no guardian-as-child inversion, Msg Rules read-only with non-steward copy |
| 4 | **Trusted adult** | `trusted-adult@` | `enableTrustedAdults`, steward→trusted_adult link (not child inversion), trusted-space membership via seed TUs |
| 5 | **Business** | `ceo@`, `cfo@`, `employee@` | Business TU messaging (CEO↔CFO), shared TU with employee, member roles (no site founder), work trust unit separate from family circle |
| 6 | **Unknown DOB** | `unknown-dob@` | `UNKNOWN` age tier, `member` shell (not founder), invite disallowed / zero daily invite limit |
| 7 | **Dashboard awareness** | All personas | Four CTA strip (Posts, Private Threads, Invites, Msg Vault), hero subtitle, sidebar Family Safe vs Msg Vault split |
| 8 | **Msg Vault** | CEO, child, founder-parent | Three-column shell (tabs + thread selector + context rail), notices tab, governance overlay on threads, deep-link `?peer=` |
| 9 | **Family Safe governance UX** | Child vs founder vs peer | **Boundaries** (minor) vs **Msg Rules** (adult/founder), read-only `FamilySettingsView` vs editable `FounderSettingsEditor` |

**Automated checks (all pass):**

- `npm run verify:aihsafe-scenarios` — 30/30  
- `npm run verify:invite-intent` — 32/32  
- `npm run verify:visible-governance` — 29/29  

---

## 2. Behavioral confusion points

| Persona | Observation | Severity |
|---------|-------------|----------|
| **Adult friend (`peer@`)** | Family Safe member overview empty state said “Your family steward will invite you” — implies household authority the friend does not have. | Medium — **fixed** |
| **Adult friend (`peer@`)** | Read-only **Msg Rules** panel used founder editor subcopy (“Set how trusted spaces…”) and “Contact your family steward” — reads like the friend manages family policy. | High — **fixed** |
| **Business (`ceo@`)** | Dashboard hero and Posts CTA said “family activity” while user’s primary circle is a business TU. | Low — **fixed** |
| **Any member shell** | Next Steps offered “Post a family update” for non-family relationships. | Low — **fixed** |
| **Guardian (`guardian@`)** | Approvals tab visible but seed has 0 pending items — easy to miss that this is the guardian inbox until a child posts. | Low — document / seed enhancement |
| **Trusted adult** | No automatic child-specific link on invite accept; steward must use People tab (Agent 74 gap). | Medium — known gap |
| **Child / teen** | Activity posting path exists; manual “submit post → see approval card” not re-run in browser this pass (kernel + policy verified). | Low |

---

## 3. Governance confusion points

| Topic | Observation |
|-------|-------------|
| **Msg Rules vs Boundaries** | Label split (Agent 71) works emotionally: minors see **Boundaries** (purple intro, steward-managed); adults see **Msg Rules**. Remaining risk: adult friends still see “family-wide settings” rows in read-only view — accurate for shared household policy but can feel like *their* rules. Intro copy now clarifies friend/work vs household. |
| **Family Safe vs Msg Vault** | Sidebar separation is clear: Family Safe = rules/spaces/activity; Msg Vault = governed DMs. Dashboard CTA routes to Msg Vault for “governance notices” — good. Some users may still look for approvals under Msg Vault (they live in Family Safe → Approvals). |
| **Site founder vs family steward** | `founder-parent@` has `role=founder` in seed (scenario steward), not confused with `founder@famtree.test` site admin. Business users are `member` — no false founder shell. |
| **UNKNOWN DOB** | UI conservatively uses member shell; policy blocks invites. Kernel still has legacy permissive visibility paths for `UNKNOWN` (documented in `shellMode.ts`) — UI does not expose founder controls. |
| **Trusted adult link model** | DB models trusted adult as `guardianUserId → childUserId` with `kind=trusted_adult` — power language in schema, not in child-facing copy. |

---

## 4. Bugs fixed (copy / role-view only)

| File | Change |
|------|--------|
| `components/aihsafe/roles/governanceView.ts` | Audience-aware intro, footnote, view-only banner, and interest-category note for read-only governance |
| `components/aihsafe/founder/FamilySettingsView.tsx` | Uses new governance helpers; peer/guardian/minor get distinct copy |
| `components/aihsafe/founder/FounderShell.tsx` | Member empty state: “Ask whoever invited you…” instead of “family steward will invite you” |
| `components/dashboard/DashboardActivityCtaStrip.tsx` | “See network activity” (was “See family activity”) |
| `components/AppPageHero.tsx` | Dashboard subtitle: “network activity at a glance” |
| `components/aihsafe/founder/NextBestActions.tsx` | “Post an update” (was “Post a family update”) in founder + member shells |

No Prisma schema changes. No new features.

---

## 5. Emotional UX observations

- **Parent:** Founder shell + Approvals + Msg Rules feels like a control room. Next Steps and overview stats reinforce stewardship. Wording “family steward” is appropriate here.
- **Child / teen:** **Boundaries** tab + purple banner feels gentler than “Msg Rules.” Lock icon + read-only rows communicate “not my job to change the rules” without shame language.
- **Teen:** Same shell as child — may feel slightly juvenile at 16; acceptable for MVP but worth a future “teen” tone pass without splitting security.
- **Adult friend:** After fixes, less implied authority. Still sees family-wide policy rows — honest but requires reading the new intro footnote.
- **Business user:** Neutral dashboard language helps. Business TU name in Msg Vault context rail (when in thread) anchors “work” context; Family Safe still says “Family” in product name — acceptable if spaces are labeled by TU type.
- **Unknown DOB:** Conservative member view avoids scary admin UI; invite block may feel opaque until DOB is collected (onboarding gap).

---

## 6. Remaining gaps

1. **Trusted adult → specific child** — still manual link after invite (Agent 74).
2. **DOB onboarding** — prompt unknown-tier users to add DOB (noted in policy defaults TODO).
3. **Approvals empty state** — guardians need a clearer “when your child posts, it appears here” empty state.
4. **Peer `@` seed** — not in `verify-relationship-scenarios.ts` EMAILS map; add `peer` + `unknown-dob` explicit checks in a follow-up script.
5. **End-to-browser E2E** — this pass relied on verification scripts + code review; full click-through (invite → accept → post → approve) should be run once with dev server + Resend skip.
6. **Msg Vault selector density** — three rails on desktop is powerful but busy; mobile collapse not re-tested here.
7. **LinkRowActions** — still says “Contact your family steward” for all members (minor copy OK; peer may misfire).

---

## 7. Validation results

| Command | Result |
|---------|--------|
| `npm run verify:aihsafe-scenarios` | ✅ 30/30 |
| `npm run verify:invite-intent` | ✅ 32/32 |
| `npm run verify:visible-governance` | ✅ 29/29 |
| `npm run typecheck` | ✅ Pass |
| `npx next build` | ✅ Pass |

---

## Test accounts (Agent 66 seed)

| Email | Role / notes |
|-------|----------------|
| `founder-parent@famtree.test` | Family steward (founder role in seed) |
| `child@famtree.test` | Minor, Boundaries shell |
| `teen@famtree.test` | Teen tier |
| `guardian@famtree.test` | Secondary guardian |
| `trusted-adult@famtree.test` | Trusted adult link |
| `peer@famtree.test` | Adult friend / peer pod |
| `ceo@famtree.test` / `cfo@` / `employee@` | Business TU |
| `unknown-dob@famtree.test` | No DOB, conservative policy |

Password: `RelationshipTest1!`

---

## Summary

Simulation across nine scenario areas found **no critical schema or enforcement regressions**; friction was primarily **copy and role-view mismatch** for adult friends and business users seeing “family” stewardship language. Six small copy/routing fixes were applied. Trusted-adult auto-linking and UNKNOWN DOB onboarding remain the highest-value follow-ups.
