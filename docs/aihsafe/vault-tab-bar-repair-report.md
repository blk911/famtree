# Dashboard Vault Tab Bar — Repair Report

**Date:** 2026-05-11  
**Branch:** aihsafe-agent-31-dashboard-vault-consolidation  
**Commit:** `96471ae`

---

## Problem

The `DashboardVaultTabs` tab bar used a plain bottom-underline pattern that was visually inconsistent and had several small issues:

- Active tab used `borderBottom: "2px solid #6366f1"` on the button **and** a `"2px solid transparent"` on inactive tabs — two separate border declarations that competed with each other and ate into the content area
- Badge span used ad-hoc `padding:"1px 4px"` with no fixed height, causing inconsistent pill sizing across badges with different digit counts
- Icon size was 13×13 px, slightly too small relative to the 13px font size
- `color` on active stayed `#6366f1` (indigo) instead of shifting to the strong `#1c1917` anchor color — made active tab harder to read
- No transition on state changes

## Fix

**File:** `components/dashboard/DashboardVaultTabs.tsx`

1. **Tab bar container** — added `padding:"10px 12px 0"` so the tab row has vertical breathing room; kept `overflowX:"auto"` for narrow viewports
2. **Active indicator** — active tab: `borderBottom:"2px solid #6366f1"`, `color:"#1c1917"`, `fontWeight:650`; inactive: `borderBottom:"2px solid transparent"`, `color:"#78716c"`, `fontWeight:500`. Clean two-state toggle.
3. **Badge sizing** — fixed `minWidth:16, height:16` with `display:inline-flex` / `justifyContent:center` / `alignItems:center` — pill stays proportional regardless of digit count
4. **Icon size** — bumped to 14×14 px for better visual balance with the text
5. **Transition** — added `transition:"color 0.12s, border-color 0.12s"` for smooth tab switching

## Verification

- `npx tsc --noEmit` — clean
- Build: passed
