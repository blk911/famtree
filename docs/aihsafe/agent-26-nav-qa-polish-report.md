# Agent 26 — Internal Nav QA / Live Flow Polish

**Branch:** `aihsafe-agent-26-nav-qa-polish`
**Date:** 2026-05-11
**Scope:** QA of Agent 25's internal navigation shell. Fetch error handling, badge fix, member Overview simplification, Approvals double-render fix. No new APIs, no schema changes.

---

## 1. Files Modified

| File | Change |
|---|---|
| `components/aihsafe/navigation/FamilySafeTabs.tsx` | Added `badges` prop; replaced `<style>` injection with proper inline `<span>` badge |
| `components/aihsafe/founder/FounderShell.tsx` | Load error banner; simplified member Overview; fixed Approvals double-render; wired `badges` prop; removed `<style>` injection |
| `components/aihsafe/feed/ActivityFeed.tsx` | Fetch error state with retry button |
| `components/aihsafe/guardian/GuardianInbox.tsx` | Fetch error state with inline retry |
| `components/aihsafe/membership/MembershipPanel.tsx` | Fetch error state with inline retry |
| `app/globals.css` | Added `.aihsafe-tab-badge` CSS class |

---

## 2. Issues Found and Fixed

### Fix 1 — ActivityFeed silent failure on network error
**Before:** `listActivityFeed()` threw `TypeError: Failed to fetch` (no server). Component stayed in loading state forever with no user feedback.
**After:** `try/catch` wraps the fetch. On failure: red banner with "Couldn't reach the server. Check your connection and try again." + Retry button. On server error (`r.kind === "error"`): same banner with `r.message`.

### Fix 2 — FounderShell.load() silent failure
**Before:** `Promise.all([...5 fetches...])` — if any threw, the `load` callback propagated the error uncaught. Page showed empty content with no indicator.
**After:** `try/catch` wraps `Promise.all`. On failure: `<LoadErrorBanner>` renders above the tab bar with "Couldn't load your family data. Check your connection." + Retry button calling `load()`.

### Fix 3 — GuardianInbox silent failure
**Before:** `listApprovals()` throw → `items` stays `null` → "Loading…" forever.
**After:** `try/catch` + `fetchError` boolean → "Couldn't load approvals. Check your connection. [Retry]" inline.

### Fix 4 — MembershipPanel silent failure
**Before:** `listTrustUnits()` throw → `units` stays `null` → "Loading…" forever.
**After:** `try/catch` + `fetchError` boolean → "Couldn't load your spaces. Check your connection. [Retry]" inline.

### Fix 5 — Approvals tab rendered GuardianInbox twice for founders
**Before:**
```
Approvals tab (founder):
  PendingAttention  ← internally renders GuardianInbox when hasApprovals
  GuardianInbox card  ← rendered again unconditionally
```
Two concurrent `listApprovals` fetches + two rendered approval lists.

**After:**
```
Approvals tab (founder):
  PendingAttention  ← handles the full case (all-clear + guardian approvals + pending invites)

Approvals tab (guardian member, non-founder):
  GuardianInbox card  ← only entry point for non-founder guardians
```

### Fix 6 — Member Overview duplicated Spaces tab content
**Before:** Member Overview showed full `MembershipPanel` (with "Leave space" buttons) — same content as the Spaces tab. Double duplication.

**After:** Member Overview shows:
- `LightStatCard` with spaces count
- `LightStatCard` with trusted adults count (if guardian)
- Empty state copy if not in any spaces yet
- Hint: "Manage your memberships in the Spaces tab"

Full `MembershipPanel` remains in the Spaces tab only.

### Fix 7 — `<style>` injection for Approvals badge was fragile
**Before:** `FounderShell` injected a `<style>` tag with string interpolation into `::after` pseudo-element — coupled to a specific DOM id, runs after hydration only, fragile.

**After:** `FamilySafeTabs` accepts a `badges?: Partial<Record<TabId, number>>` prop. Each tab button conditionally renders a `<span className="aihsafe-tab-badge" aria-label="N pending">N</span>`. Styled via `.aihsafe-tab-badge` in `globals.css`. Badge is SSR-safe, accessible, and cleanly composed.

---

## 3. Tab QA Results

| Tab | Founder | Guardian member | Adult member | Child |
|---|---|---|---|---|
| Overview | ✅ Governance + quick actions (no MembershipPanel) | ✅ Guardian Inbox + network summary | ✅ Network summary + invite | N/A (tab hidden) |
| Activity | ✅ Feed only, full-width, error state if fetch fails | ✅ Same | ✅ Same | ✅ Child-safe feed |
| Spaces | ✅ SpacesSnapshot + FamilySnapshot with create | ✅ MembershipPanel (leave buttons) | ✅ MembershipPanel (leave buttons) | ✅ ChildApprovedSpacesCard (read-only) |
| People | ✅ RelationshipVisibilityCard + TrustedExtensionsPanel | ✅ Visibility explanation + RelationshipVisibilityCard | ✅ Same | N/A |
| Approvals | ✅ PendingAttention (all-clear or full list, 1× GuardianInbox inside) | ✅ GuardianInbox card | N/A | N/A |
| Settings | ✅ FounderSettingsPreview | N/A | N/A | N/A |

---

## 4. Error Messaging Summary

| Component | Error trigger | User sees |
|---|---|---|
| FounderShell | Any of 5 parallel shell fetches throws | Red banner above tabs: "Couldn't load your family data" + Retry |
| ActivityFeed | `listActivityFeed` throws | Red banner in feed area: "Couldn't load posts" + Retry |
| ActivityFeed | Server returns non-ok | Same banner with server message |
| GuardianInbox | `listApprovals` throws | Inline: "Couldn't load approvals. Check your connection. [Retry]" |
| MembershipPanel | `listTrustUnits` throws | Inline: "Couldn't load your spaces. Check your connection. [Retry]" |

All retry actions re-call the same fetch function — no page reload required.

---

## 5. Validation Results

```
npm run typecheck  →  0 errors
npm run build      →  ✓ Compiled successfully
                       /aihsafe  16.6 kB  (+0.5 kB for error handling)
```

---

## 6. Remaining Gaps (out of scope)

| Gap | Notes |
|---|---|
| Tab URL persistence | Active tab resets on page reload. Future: `?tab=activity` search param. |
| CommentThread viewerMode | Not forwarded. Low priority — governance gate enforces at API level. |
| Approvals badge SSR | Badge renders correctly on client after hydration; no SSR issue since `pendingCount` is derived from client-fetched state. |
| MembershipPanel "Leave space" on sole-member unit | Server returns 409; UI shows error. Pre-beta P2 item. |

---

## 7. QA Sign-off

| Agent | Area | Status |
|---|---|---|
| Agent 22 | Role routing + UNKNOWN age safety | ✓ Done |
| Agent 23 | Complete role-based layout branching | ✓ Done |
| Agent 24 | Role view visual QA | ✓ Done |
| Agent 25 | Internal navigation shell | ✓ Done |
| Agent 26 | Nav QA / live flow polish | ✓ Done |
