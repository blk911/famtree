# Agent 18 — Family Safe Light Hero Match Report

**Branch:** `aihsafe-agent-18-light-hero-match`
**Date:** 2026-05-10
**Scope:** Replace the dark amber gradient hero with a light, cream-backed hero card matching the reference direction. No backend changes, no schema changes, no new APIs.

---

## 1. Files Modified

| File | Change |
|---|---|
| `components/aihsafe/founder/FounderShell.tsx` | Replaced `HeroPill` + dark gradient hero with `LightStatCard` + light cream card |
| `app/globals.css` | Added `.aihsafe-hero-img` breakpoint to hide image panel at ≤680px |

## Files Created

| File | Purpose |
|---|---|
| `docs/aihsafe/agent-18-light-hero-match-report.md` | This report |

---

## 2. Hero Visual Changes

**Before (Agent 17):** Dark amber-terracotta CSS gradient (`#1a0800 → #4a1600 → #7c2d12`), single-column, white text, pill-shaped `HeroPill` stats with translucent dark backgrounds.

**After (Agent 18):** Light cream card with warm golden-hour image on the right.

### Structure
```
[borderRadius: 22, background: #fffaf3, border: 1px solid #eadfd2, overflow: hidden]
  ├─ LEFT ACCENT STRIPE (absolute, 6px wide)
  │   background: linear-gradient(180deg, #7c3aed → #2563eb)
  │
  ├─ RIGHT IMAGE PANEL (absolute, 44% width)
  │   image: /uploads/Index bkgrn 4.jpg
  │   mask: transparent → visible (left to right)
  │   opacity: 0.55
  │
  └─ CONTENT (position relative, zIndex 1, padding 28px 32px 26px 26px)
       ├─ Shield SVG + "FAMILY SAFE" label (purple, uppercase, 11px)
       ├─ H1: "A governed network for your real people." (dark navy, 28px, 800)
       ├─ Steward: "You are the steward of this family network." (stone, 13px)
       └─ 4 × LightStatCard (white bg, border, amber when urgent)
```

---

## 3. Image Asset Used

**Asset:** `public/uploads/Index bkgrn 4.jpg`
**URL:** `/uploads/Index%20bkgrn%204.jpg`
**Description:** Warm golden-hour soft-focus wildflower field — yellow flowers against soft sunlit bokeh. Calm, warm, nature-oriented. Already used in `HomeClient.tsx` as the main landing background.

**Blending technique:** Absolute-positioned right panel (44% width) with CSS `mask-image` / `-webkit-mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,0.25) 25%, rgba(0,0,0,0.7) 55%, black 100%)`. The image fades in from the left edge, leaving the text side clean cream. Opacity set to 0.55 so the card background color still reads through.

---

## 4. Counter Treatment

`LightStatCard` replaces `HeroPill`. Each card:
- Background: `#fff` (white)
- Border: `1px solid #e7e5e4` (neutral) or `#fde68a` (amber when urgent)
- Border radius: `10px`
- Padding: `8px 14px`
- Value: `22px`, `font-weight: 800`, `#1c1917` (dark) or `#d97706` (amber when urgent)
- Label: `11px`, `#78716c` (stone muted)
- Shadow: `0 1px 3px rgba(0,0,0,0.06)`

Urgent treatment (amber value + border) applied when `pendingApprovals.length > 0` or `pendingInvites.length > 0`.

---

## 5. Responsive Behavior

**Desktop (>680px):** Full hero — left text/stat content + right image panel. Purple accent stripe visible on left edge.

**Mobile (≤680px):** `.aihsafe-hero-img` hides via `display: none !important`. Hero renders as cream card with left stripe, text, and stat cards only. Stats flex-wrap naturally at narrow widths.

`.aihsafe-grid` 2-col → 1-col collapse at ≤900px preserved (unchanged from Agent 16).

---

## 6. Validation Results

```
npx tsc --noEmit --skipLibCheck  →  0 errors
npm run build                    →  ✓ Compiled successfully (75 routes)
```

---

## QA Sign-off

| Agent | Area | Status |
|---|---|---|
| Agent 8  | UX shell scaffold | ✓ Done |
| Agent 9  | UX contract QA | ✓ Done |
| Agent 10 | DTO name field | ✓ Done |
| Agent 11 | Name persistence | ✓ Done |
| Agent 12 | E2E QA + deferred action + name consistency | ✓ Done |
| Agent 14 | Relational dashboard layout | ✓ Done |
| Agent 15 | Founder / Guardian shell | ✓ Done |
| Agent 16 | Consolidated hero | ✓ Done |
| Agent 17 | Unified mode shell | ✓ Done |
| Agent 18 | Light hero match | ✓ Done |
