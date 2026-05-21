# LT styling foundation — complete report

**Mission:** Bulletproof long-term styling — UI primitives + tokens, dashboard CTA proof migration, globals regression guard.  
**Date:** 2026-05-20

---

## Summary

Replaced globals-dependent dashboard activity CTAs with co-located **`components/ui`** primitives (CVA + Tailwind). Added design tokens, `cn()` helper, CI guard against reintroducing removed globals selectors, and documented the styling contract.

**User-visible:** Dashboard activity strip (Posts / Private Threads / Invites / Msg Vault) now styles via `CtaCard` — same layout and states, cannot “lose” CSS on deploy.

---

## Files created

| File | Purpose |
|------|---------|
| `lib/cn.ts` | `clsx` + `tailwind-merge` merge helper |
| `components/ui/button.tsx` | `Button` primitive — `primary` / `secondary` / `ghost` (CVA) |
| `components/ui/cta-card.tsx` | `CtaCard`, `CtaCardGrid`, label/status/action parts (CVA) |
| `components/ui/index.ts` | Public UI barrel exports |
| `docs/ui/styling-contract.md` | Long-term rules for team + agents |
| `scripts/check-globals-css-allowlist.mjs` | CI regression guard |
| `docs/ui/agent-lt-styling-foundation-report.md` | This report |

---

## Files modified

| File | Change |
|------|--------|
| `components/dashboard/DashboardActivityCtaStrip.tsx` | Uses `CtaCard*` from `components/ui`; Lucide `className` sizing |
| `components/dashboard/DashboardMemberLayout.tsx` | `dashboard-member-stack` → Tailwind `flex flex-col gap-4` |
| `app/globals.css` | Added `:root` tokens + `button/input` font inherit; **removed** ~93 lines `.dashboard-activity-cta*` + `.dashboard-member-stack` |
| `package.json` | Script: `check:globals-css` |

---

## Files deleted from globals (not deleted from repo)

Removed selectors (guard in `check:globals-css`):

- `.dashboard-member-stack`
- `.dashboard-activity-cta-grid`
- `.dashboard-activity-cta` (+ `--active`, `--urgent`, `__icon`, `__label`, `__status`, `__action`)

---

## Architecture after change

```
globals.css     → tokens + shell + legacy (msg-vault, aihsafe, …) — shrinking over time
components/ui/  → CtaCard, Button (canonical interactive styling)
dashboard/      → composes ui/* only for CTA strip
```

---

## CTA behavior (unchanged)

| Card | Click | Active state |
|------|-------|----------------|
| Posts | `onSelectTab("posts")` | `active` when tab is posts |
| Private Threads | `onSelectTab("pvt-feeds")` | active when pvt-feeds |
| Invites | `onSelectTab("invites")` | active when invites |
| Msg Vault | `router.push("/msg-vault")` | never `active` on dashboard |

Urgent: amber border/background when counts &gt; 0 or vault needs review. Active: indigo ring. Compound: urgent + active → violet background.

---

## Tokens added (`:root`)

| Token | Value | Usage |
|-------|-------|--------|
| `--surface` | `#fafaf9` | body background |
| `--surface-elevated` | `#ffffff` | CTA cards |
| `--border-subtle` | `#ece9e3` | card borders |
| `--border-muted` | `#d6d3d1` | hover borders |
| `--ink` | `#1c1917` | primary text |
| `--muted` | `#78716c` | labels |
| `--muted-body` | `#57534e` | action line |
| `--accent` | `#6366f1` | active ring, icons |
| `--urgent` / `--urgent-ink` | amber tones | status emphasis |
| `--shadow-card` / `--shadow-card-hover` | soft shadows | cards |

---

## Tests and validation

| Command | Purpose | Result |
|---------|---------|--------|
| `npm run check:globals-css` | Forbidden selector regression | **Pass** |
| `npm run typecheck` | TS for new `ui/*` + dashboard | **Pass** |
| `npx next build` | Production CSS bundle | **Pass** (exit 0) |
| `npm run lint` | ESLint | **Skipped** — no ESLint config in repo (interactive setup prompt only) |

### Manual QA checklist

- [ ] `/dashboard` — four CTA cards in 4-col grid (desktop), 2-col tablet, 1-col mobile
- [ ] Hover: border/shadow lift
- [ ] Active tab: indigo ring on matching card
- [ ] Pending invites / new posts: amber urgent styling
- [ ] Msg Vault card navigates to `/msg-vault`
- [ ] Hard refresh / production deploy: cards **not** browser-default gray buttons

---

## CI recommendation

Add to PR / pre-deploy pipeline:

```bash
npm run check:globals-css && npm run typecheck && npx next build
```

---

## Next migration phases (not in this PR)

1. `dashboard-private-*` globals → Tailwind or `ui/`
2. `msg-vault-*` / `thread-*` globals
3. `aihsafe-*` globals
4. `AppShell` inline styles → `Button` / layout utilities

---

## Dependencies used (already in repo)

- `class-variance-authority`
- `clsx`
- `tailwind-merge`
- `@radix-ui/react-slot` (available; `Button` uses native `button` for now)

No new npm packages.

---

*LT styling foundation — Phase 0 + Phase 1 (dashboard CTA proof).*
