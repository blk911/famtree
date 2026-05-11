# Agent 31 — Dashboard / Vault Consolidation

**Branch:** `aihsafe-agent-31-dashboard-vault-consolidation`
**Date:** 2026-05-11
**Scope:** Collapse the separate Vault nav items into the Dashboard; give members a tabbed activity center; add a context rail; remove Open Feed / Private Feed / My Posts from the sidebar.

---

## 1. Files Created

| File | Purpose |
|---|---|
| `components/dashboard/ContextRailCard.tsx` | Compact titled card wrapper used by the context rail. Optional count chip + "View →" link in header. |
| `components/dashboard/DashboardContextRail.tsx` | Right-column server component — stacked rail cards for Family Tree preview, Trust Units summary, and Family Safe entry. |
| `components/dashboard/DashboardVaultTabs.tsx` | Client-side tabbed panel replacing the 3 separate vault quick-action cards. Five tabs: Messages · Feed · My Posts · Invites · Family Safe. |

## 2. Files Modified

| File | Change |
|---|---|
| `app/(app)/dashboard/page.tsx` | Removed 3 quick-action cards (VAULT Messages, Family Safe, Invite); removed CollapsibleSection blocks for Tree / Trust Units / Invites; added two-column `.dashboard-body` layout; serializes invite data for `DashboardVaultTabs`; passes tree + trust unit data to `DashboardContextRail`. |
| `components/AppSidebar.tsx` | Removed `VAULT_ITEMS` constant, `vaultActive` computed variable, `vaultOpen` state, and the entire "My Vault" accordion block. Removed unused `User` icon import. |
| `app/globals.css` | Added `.dashboard-body` responsive grid: `1fr 232px` → single column at ≤860 px. |

---

## 3. Dashboard Structure After Change

```
┌─ ProfileCompletionPrompt (conditional) ─────────────────────────────────────┐
│  IncomingIdentityAcks                                                        │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ Stats (3 cards) ────────────────────────────────────────────────────────────┐
│  TREE MEMBERS · INVITES SENT · JOINED VIA YOU                                │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ Invite quick-action card ───────────────────────────────────────────────────┐
│  ✉️  Invite someone  ·  Send a photo-verified invite                         │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ Main column ──────────────────────────────┐  ┌─ Context rail ──────────────┐
│  DashboardTrustUnitGate                    │  │  Family Tree (5 names)      │
│                                            │  │  [View →]                   │
│  ┌─ DashboardVaultTabs ─────────────────┐ │  │  ─────────────────────────  │
│  │  [Messages] [Feed] [My Posts]         │ │  │  Trust Units (if any)       │
│  │  [Invites]  [Family Safe]             │ │  │  ─────────────────────────  │
│  │                                       │ │  │  Family Safe (CTA button)   │
│  │  Panel content per selected tab       │ │  └─────────────────────────────┘
│  └───────────────────────────────────────┘ │
│                                            │
│  Family Tree card (first 8, if any)        │
└────────────────────────────────────────────┘
```

---

## 4. Tab Behaviour

| Tab | Badge | Content |
|---|---|---|
| Messages | `vaultNewCount` (new posts + comments since last login) | Two link rows: Open Feed + Private Feed, each with "N new" badge |
| Feed | `newPostsCount` | Count copy + "Open Feed →" button to `/family-vault/posts` |
| My Posts | — | Brief copy + "View My Posts →" link to `/profile` |
| Invites | pending invite count | Full invite list with status chips; "View all →" / "Invite someone" CTA when empty |
| Family Safe | — | Brief copy + "Open Family Safe →" button to `/aihsafe` |

---

## 5. Sidebar Nav After Change

| Item | Destination |
|---|---|
| Dashboard | `/dashboard` |
| Family (accordion) | `/tree` · `/family-vault/family-units` |
| Invite | `/invite` |
| Family Safe | `/aihsafe` |
| AIH Studios | Studio href (user-specific) |
| Settings | `/settings` (accordion for admin) |

**Removed:** Open Feed, Private Feed, My Posts sub-items and the My Vault accordion.

---

## 6. Validation Results

```
npx tsc --noEmit  →  0 errors
npm run build     →  ✓ Compiled successfully
```

---

## 7. Remaining Gaps

| Gap | Notes |
|---|---|
| Feed tab shows a count but no post previews | `newPosts` has body text but no `authorName`. Easy to add if needed: join on profile query. |
| Context rail has no "Approvals / Trusted Adults" cards | Mission listed these but they require additional DB queries; low priority for members. |
| My Vault pages still accessible via direct URL | Sidebar link removed but pages unchanged — intentional; tabs now serve as the entry point. |
