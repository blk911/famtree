# Family Sidebar Link — Repair Report

**Date:** 2026-05-11  
**Branch:** aihsafe-agent-31-dashboard-vault-consolidation  
**Commit:** `650b759`

---

## Problem

The "Family" entry in the left-side navigation bar was non-functional. Clicking it produced no navigation — the URL stayed on `/dashboard`. The sub-items (Tree, Units) also remained hidden.

## Root Cause

The Family nav item was implemented as a `<button>` with an `onClick` handler that called `router.push("/tree")` for first-visit navigation, and `setFamilyOpen((v) => !v)` for toggle when already on a family route.

`router.push` inside a button `onClick` handler is unreliable in the Next.js 14 App Router. The imperative push fires but the navigation does not complete, leaving the URL unchanged. This is a known footgun: `<Link>` is the correct primitive for declarative page navigation.

Additionally, the component held a `familyOpen` state variable whose sole purpose was to track whether the submenu should be expanded — redundant because `familyActive` (derived from `usePathname()`) already captures exactly that condition.

## Fix

**File:** `components/AppSidebar.tsx`

1. Replaced the `<button>` element with `<Link href="/tree">` — navigation now uses the Next.js Link component which handles prefetching, soft navigation, and active-route detection correctly.
2. Removed the `familyOpen` state declaration and all `setFamilyOpen` calls.
3. Changed the submenu render condition from `{familyOpen && ...}` to `{familyActive && ...}` — the submenu expands whenever the user is on `/tree`, `/tree/*`, or `/family-vault/family-units`.
4. Chevron rotation similarly updated from `familyOpen` → `familyActive`.

## Verification

- `npx tsc --noEmit` — no errors
- Grep confirmed zero remaining `familyOpen` / `setFamilyOpen` references in the file
