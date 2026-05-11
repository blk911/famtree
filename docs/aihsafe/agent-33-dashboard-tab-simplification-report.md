# Agent 33 — Dashboard Tab Simplification

**Branch:** `aihsafe-agent-31-dashboard-vault-consolidation`
**Date:** 2026-05-11
**Scope:** Rename tabs, reset default to Posts, eliminate the nested-menu feel in the two feed tabs so the dashboard feels immediate and social.

---

## 1. Files Modified

| File | Change |
|---|---|
| `components/dashboard/DashboardVaultTabs.tsx` | Tab IDs, labels, default state, icon swap, both feed panel rewrites. Dropped unused `vaultNewCount` prop. |
| `app/(app)/dashboard/page.tsx` | Removed `vaultNewCount` prop pass-through (prop no longer declared). |

---

## 2. Tab Map — Before / After

| Before ID | Before Label | After ID | After Label | Default |
|---|---|---|---|---|
| `"messages"` | Messages | `"posts"` | Posts | ✓ opens on load |
| `"feed"` | Feed | `"pvt-feeds"` | Pvt Feeds | — |
| `"posts"` | My Posts | `"my-posts"` | My Posts | — |
| `"invites"` | Invites | `"invites"` | Invites | — |
| `"family-safe"` | Family Safe | `"family-safe"` | Family Safe | — |

---

## 3. Posts Panel — Before / After

### Before (menu feel)
```
Your Conversations    [N new items since last visit]

[💬 icon card]  Open Feed | "N new" badge  →
[🔒 icon card]  Private Feed | "N new" badge  →
```
Two nested link cards — felt like picking from a menu before reaching content.

### After (immediate / social)
```
[🔥 N new posts from your family     ]   ← warm amber if active
[   New activity since your last visit]

[  See what's happening →  ]   ← full-width indigo gradient button

[  ✏️ Share something with your family  ]   ← secondary lavender button
```
- Activity state drives the banner: amber 🔥 if new posts, green ✓ if caught up
- Two full-width CTAs — primary goes to `/family-vault/posts`, secondary too (compose intent)
- Icon changed from `MessageSquare` to `Users` (social, not chat-app)

---

## 4. Pvt Feeds Panel — Before / After

### Before (info page feel)
```
Family Feed
Posts and updates shared across your family network.

[● N new posts since your last visit]

[Rss icon] Open Family Feed →
```
Heading + paragraph + pill + button — read like documentation.

### After (direct / immediate)
```
[💬 N new conversations in your circles]   ← purple if active
[   Activity in your private spaces      ]

[  Open private feeds →  ]   ← full-width purple gradient button

trust units · family circles · governed pods   ← quiet descriptor line
```
- Activity banner uses purple/violet for visual distinction from Posts (indigo)
- Quiet when idle: 🔒 "Your private circles — quiet for now"
- Descriptor line replaces the feature-list paragraph — less document, more place

---

## 5. What Didn't Change

| Item | Reason |
|---|---|
| My Posts panel | Content was already appropriate — just renamed tab ID to `"my-posts"` |
| Invites panel | Full activity list already renders directly — no change needed |
| Family Safe panel | Feature bullets + CTA still correct — unchanged |
| `DashboardContextRail` | Not in scope |
| `app/globals.css` | No additional classes needed |
| Backend / APIs / schema | Mission prohibits changes |

---

## 6. Validation Results

```
npx tsc --noEmit  →  0 errors
npm run build     →  ✓ Compiled successfully
```
