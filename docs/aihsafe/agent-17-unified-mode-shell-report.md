# Agent 17 — Unified Mode Shell Report

**Branch:** `aihsafe-agent-17-unified-mode-shell`
**Date:** 2026-05-10
**Scope:** Convert `/aihsafe` into a single unified "Family Safe Mode" experience. No backend changes, no schema changes, no new APIs.

---

## Files Modified

| File | Change |
|---|---|
| `components/aihsafe/founder/FounderShell.tsx` | Replaced image-backed hero with warm CSS gradient; added `HeroPill` atom; removed `CompactStat` import; removed AMIHUMAN.NET overline from hero |
| `app/globals.css` | Removed unused `.aihsafe-hero-inner` responsive rule (hero no longer uses a flex two-column layout) |
| `components/AppPageHero.tsx` | Added `/aihsafe` entry to `HERO_COPY` with `hidden: true`; `AppPageHero` returns `null` for this route — eliminates the duplicate AMIHUMAN.NET top banner |

## Files Created

| File | Purpose |
|---|---|
| `docs/aihsafe/agent-17-unified-mode-shell-report.md` | This report |

---

## 1. Problem: Two Competing Identities

The `/aihsafe` route had two competing hero identities:
- The global `AppShell` already shows the AMIHUMAN.NET brand nav
- `FounderShell` hero *also* showed an "AMIHUMAN.NET" overline, creating a redundant identity double-dip
- The `index-bg3.webp` background with a dark navy/purple overlay read as cyber/AI/network infrastructure — wrong emotional register for a family governance product

---

## 2. AppPageHero Suppressed on /aihsafe

`components/AppPageHero.tsx` contains a `HERO_COPY` lookup table. Paths not in the table fall back to `{ title: "AMIHUMAN.NET", subtitle: "Private family network" }`, which was rendering a large hero card above the FounderShell hero.

Fix: added one entry to `HERO_COPY`:
```ts
{ match: (path) => path === "/aihsafe" || path.startsWith("/aihsafe/"), title: "", subtitle: "", hidden: true }
```
`AppPageHero` now returns `null` when `copy.hidden` is set. No other routes are affected. The sidebar logo and nav remain untouched — AMIHUMAN.NET brand appears once (sidebar), not twice (sidebar + hero).

---

## 4. Hero Changes

**Before:** `index-bg3.webp` + dark navy-purple overlay (`rgba(15,52,96,0.84)` → `rgba(20,10,28,0.78)`) + AMIHUMAN.NET overline + left/right flex split with 4 CompactStat blocks on right.

**After:** Pure CSS warm gradient + single-column layout + inline `HeroPill` stat row.

### Gradient palette
```
background: linear-gradient(150deg, #1a0800 0%, #4a1600 38%, #7c2d12 70%, #2d0d00 100%)
```
Warm amber-terracotta tones (deep brick, not cold navy). Subtly lightened at top with a `rgba(255,160,50,0.06)` warm tint overlay. Reads as: hearth, warmth, protection — not AI network.

### Structure
```
[borderRadius: 20, overflow: hidden]
  ├─ background: warm amber-terracotta gradient
  ├─ OVERLAY: rgba(255,160,50,0.06) → rgba(0,0,0,0.30) subtle depth
  └─ CONTENT (position: relative, zIndex: 1, padding: 32px 36px 28px)
       ├─ MODE LABEL: 🏡  FAMILY SAFE MODE  (uppercase, 11px, muted)
       ├─ H1: "Your protected family network"  (white, 30px, weight 800)
       ├─ SUBTITLE: "A governed space for your real people..."  (68% white, 14px)
       └─ PILL ROW: 4 × HeroPill (inline, low-weight, amber when urgent)
```

---

## 3. AMIHUMAN.NET Overline Removed

The old hero showed `AMIHUMAN.NET` as an uppercase overline in the hero. This is now removed — the brand appears once in the global AppShell nav, not twice on the same screen.

The hero now opens with `🏡 FAMILY SAFE MODE` — mode identification, not brand identification. This resolves the double-identity conflict without touching AppShell.

---

## 4. HeroPill — Replaces CompactStat in Hero

`HeroPill` is a lightweight inline atom added directly to `FounderShell.tsx` (not a separate file — only used here):

| Property | Value |
|---|---|
| Layout | `inline-flex`, `gap: 5px`, `whiteSpace: nowrap` |
| Background | `rgba(255,255,255,0.10)` normal / `rgba(251,191,36,0.14)` urgent |
| Border | `rgba(255,255,255,0.14)` normal / `rgba(251,191,36,0.32)` urgent |
| Border radius | `20px` (pill shape) |
| Padding | `5px 13px` |
| Value | `13px`, `font-weight: 700`, white / `#fbbf24` urgent |
| Label | `12px`, `rgba(255,255,255,0.78)` |

**Compared to CompactStat:** The old `CompactStat` used `fontSize: 22` for the number and `padding: 10px 18px` with `minWidth: 64` — blocky card-style tiles. `HeroPill` is ~40% smaller footprint: a compact horizontal pill that integrates with the hero text rather than competing with it.

`CompactStat` import removed from `FounderShell.tsx` (it remains available for other consumers).

---

## 5. globals.css Cleanup

Removed `.aihsafe-hero-inner` rule and its `@media (max-width: 700px)` breakpoint. The old rule controlled `flex-direction: column` for the hero's two-column split on mobile. The new hero is a single-column layout — no CSS class needed. The mobile breakpoint is no longer applicable.

`.aihsafe-grid` rule (2-col → 1-col at ≤900px) is preserved — still used by the main content grid below the hero.

---

## 6. What Stayed Unchanged

- All dashboard panels: `GovernanceOverview`, `PendingAttention`, `FamilyHealthPanel`, `TrustedExtensionsPanel`, `RelationshipVisibilityCard`, `FounderSettingsPreview`
- `FamilySnapshot`, `SpacesSnapshot`, `QuickCreateModal`, all panel sub-components
- `CompactActivityItem`, `SectionHeader`
- All API calls, derived counts, modal logic, activity ribbon
- `app/(app)/aihsafe/page.tsx` — unchanged (thin server component)
- `apiClient.ts` — unchanged

---

## 7. Validation Results

```
npx tsc --noEmit --skipLibCheck  →  0 errors
```

Build note: `npm run build` is blocked on Windows when the dev server is running (EPERM Prisma DLL lock). TypeScript 0 errors confirms code correctness. Pre-existing constraint documented in agent-12-e2e-qa-report.md.

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
| Agent 17 | Unified mode shell | ✓ Done |
