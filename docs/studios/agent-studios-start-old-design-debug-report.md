# Studios `/studios/start` — old design debug report

**Date:** 2026-05-19  
**Symptom:** `amihuman.net/studios/start` shows legacy trainer UI (PERFORMANCE / SVC INQUIRY nav, Performance & Longevity grid, Private Client Feedback carousel, `StudioHeroIntroColumn` hero).  
**Branch with fix (pre-merge):** `fix/studios-start-community-redesign` (cherry-pick of `fdb907f` onto `main`)

---

## Root cause

Production deploys from **`main`**, which never received the community-platform redesign.

| Signal (old UI) | Where it lived on `main` |
|-----------------|--------------------------|
| Nav: ABOUT · PERFORMANCE · SVC INQUIRY · LOCATION · CONTACT | `components/studios/StudioTopNav.tsx` `BUSINESS_NAV` |
| Section: Performance & Longevity + training cards | `TrainerStudioShell` + `StudioTrainingCards` |
| Section: Private Client Feedback | `StudioProofCardsSection` in start shell |
| Hero: TAP → WATCH INTRO / two-column intro column | `ApplyStudioHero` + `StudioHeroIntroColumn` |

The redesign landed in commit **`fdb907f`** (`feat(studios): community hero triad and published-spaces architecture`), which is on `ui-lt-styling-foundation` and related studio branches but **not** on `main` until merged.

Local/workspace code on those branches already renders:

- `StudioTopNav`: WHY STUDIOS · HOW IT WORKS · LOCATION · CONTACT  
- `StudioWhyStudiosSection` + `StudioHowStudiosWorkSection`  
- Published/preview hero: `StudioHeroTriad` + `StudioHeroPlatformCard`  
- Neutral template + profile hydration on `/studios/start`

---

## Repair

1. **Deploy path:** Merge `fix/studios-start-community-redesign` → `main` and redeploy Vercel (or merge `fdb907f` directly).
2. **Sidebar routing (included in cherry-pick `5cb8c11`):** On `main`, `tenantId` / `studioSlug` could send members to seed personas (e.g. deb-dazzle) with the old live shell. Routing now uses **owned** `studiosOwned[0].slug` only; otherwise `/studios/start`.
3. **After deploy:** Hard-refresh `/studios/start` (or incognito) so the new JS bundle loads. Hero intro drafts use `_intro_v5` / `amih_studios_neutral_base_draft_v2` — stale fitness-era localStorage may still override copy until cleared.

---

## Verification checklist

- [ ] `/studios/start` — nav shows WHY STUDIOS / HOW IT WORKS (not PERFORMANCE / SVC INQUIRY)
- [ ] Body — Why Studios + How Studios Work sections (not Performance & Longevity or Private Client Feedback)
- [ ] Published mode — three-column `StudioHeroTriad` platform cards
- [ ] Logged-in member without owned studio — sidebar **AIH Studios** → `/studios/start`
- [ ] `npm run typecheck` && `npm run build` on merge target

---

## Not in scope

- Gap U flagship (`/studios/gap-u`) — separate branch `studios-agent-106-gapu-live-foundation`
- Builder wizard (`/studios/create`) — later commits (`8c706cc`+); not required for start-page visual fix
- Admin preset lab still offers fitness template tab for comparison (`StudioPresetLab`)

---

## References

- `docs/studios/agent-89-community-platform-redesign-report.md`
- `docs/studio-templates.md`
- Fix commit: `fdb907f` / cherry-pick on `fix/studios-start-community-redesign`
