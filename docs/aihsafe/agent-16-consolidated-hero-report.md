# Agent 16 — Consolidated Family Safe Hero Report

**Branch:** `aihsafe-agent-16-consolidated-hero`
**Date:** 2026-05-10
**Scope:** Replace the plain white founder header card with a consolidated, image-backed branded hero. No backend changes, no schema changes, no new APIs.

---

## Files Modified

| File | Change |
|---|---|
| `components/aihsafe/founder/FounderShell.tsx` | Replaced plain white header card with image-backed hero; added `CompactStat` import; removed dead `AwarenessPill` function |
| `app/globals.css` | Added `.aihsafe-hero-inner` responsive rule (stat cards stack below identity on ≤700px) |

## Files Created

| File | Purpose |
|---|---|
| `docs/aihsafe/agent-16-consolidated-hero-report.md` | This report |

---

## 1. Hero Changes

**Before:** A plain white `div` card with a 4px navy-purple left accent stripe. Text only — no background image. Used custom `AwarenessPill` components (light background, dark text).

**After:** Full-bleed image hero using `url('/uploads/index-bg3.webp')` — the same background image used in the auth layout (`app/(auth)/layout.tsx`). Consistent with the existing brand image vocabulary.

Structure:
```
[borderRadius: 20, overflow: hidden]
  ├─ backgroundImage: url('/uploads/index-bg3.webp'), cover, center
  ├─ OVERLAY: linear-gradient(135deg, rgba(15,52,96,0.84), rgba(20,10,28,0.78))
  └─ CONTENT (position: relative, z-index: 1)
       ├─ LEFT: overline · h1 · subtitle · steward line
       └─ RIGHT: 4 × CompactStat cards
```

Left column text (on dark background):
- Overline: `AMIHUMAN.NET` — `rgba(255,255,255,0.50)`, 11px, uppercase, tracking-wide
- H1: `Family Safe` — white, 34px, weight 800, letterSpacing -0.6px
- Subtitle: `"A governed network for your real people."` — `rgba(255,255,255,0.78)`, 15px
- Steward: `"You are the steward of this family network."` — `rgba(255,255,255,0.45)`, 12px

---

## 2. Removed Duplicate UI

The `AwarenessPill` internal function (45 lines) is removed entirely. It was only used in the old plain white header and is fully replaced by `CompactStat` in the new hero.

No other components were modified. All dashboard sections below the hero are preserved unchanged.

---

## 3. Counter Placement

The four stat counters are now `CompactStat` components placed in the hero's right column (flexbox, `flex-wrap: wrap`):

| Stat | Accent when urgent |
|---|---|
| approvals waiting | `#fbbf24` (amber) when > 0 |
| active spaces | white (always) |
| trusted adults | white (always) |
| pending invites | `#fbbf24` (amber) when > 0 |

`CompactStat` was already designed for dark backgrounds: `rgba(255,255,255,0.10)` background, `rgba(255,255,255,0.15)` border, `rgba(255,255,255,0.65)` label text. No changes to `CompactStat.tsx` required.

---

## 4. Responsive Behavior

**Desktop (>700px):** Hero content is `display: flex, flex-wrap: wrap, justify-content: space-between` — identity on left, stat cards on right, aligned to bottom edge.

**Mobile (≤700px):** `.aihsafe-hero-inner` CSS class triggers:
- `flex-direction: column` — stacks identity above stat cards
- `align-items: flex-start` — left-aligned
- Reduced padding: `24px 22px`

**Grid (≤900px):** Existing `.aihsafe-grid` breakpoint already collapses the 2-column section grid to 1 column.

---

## 5. Validation Results

```
npx tsc --noEmit --skipLibCheck  →  0 errors
npm run build                    →  ✓ Compiled successfully (75 routes)
```

Build note: the EPERM on first attempt is the known Windows dev-server file lock on the Prisma engine DLL. Resolved by stopping the dev server before building — same pre-existing constraint documented in agent-12-e2e-qa-report.md.

---

## QA Sign-off

| Agent | Area | Status |
|---|---|---|
| Agent 8 | UX shell scaffold | ✓ Done |
| Agent 9 | UX contract QA | ✓ Done |
| Agent 10 | DTO name field | ✓ Done |
| Agent 11 | Name persistence | ✓ Done |
| Agent 12 | E2E QA + deferred action + name consistency | ✓ Done |
| Agent 14 | Relational dashboard layout | ✓ Done |
| Agent 15 | Founder / Guardian shell | ✓ Done |
| Agent 16 | Consolidated hero | ✓ Done |
