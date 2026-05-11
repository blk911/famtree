# Agent 32 — Dashboard Message Hub Polish

**Branch:** `aihsafe-agent-31-dashboard-vault-consolidation`
**Date:** 2026-05-11
**Scope:** Polish the member Dashboard into a cohesive daily message/content hub. Merge the Invite action into the metric strip. Remove the redundant Family Tree center block. Deepen each tab panel so each stream feels distinct.

---

## 1. Files Modified

| File | Change |
|---|---|
| `app/(app)/dashboard/page.tsx` | 4-col metric strip (3 stats + Invite tile); removed Family Tree center block and `treeViewPrefs` DB query; renamed `invites` → `treeInvites` (internal) to avoid shadowing. |
| `components/dashboard/DashboardVaultTabs.tsx` | Rewrote all 5 tab panels with richer, stream-specific content. |
| `app/globals.css` | Added `.dashboard-metrics` responsive class: 4-col → 2-col at ≤680 px. |

---

## 2. Metric Strip — Before / After

### Before
```
[TREE MEMBERS: N]  [INVITES SENT: N]  [JOINED VIA YOU: N]

[Large: Invite someone card — ✉️ heading + subtitle]
```

### After
```
[TREE MEMBERS: N]  [INVITES SENT: N]  [JOINED VIA YOU: N]  [INVITE ✉️]
                                                             (dark CTA tile)
```

The Invite tile uses the dark navy gradient to signal it is an action, not a read-only stat. At ≤680 px it wraps to a 2×2 grid.

---

## 3. Removed Center Block

The `{flat.length > 0 && <TreeList ...>}` block that appeared below the tabs was removed. The family tree is already accessible via:
- Right context rail (compact 5-name list)
- Left sidebar nav → Family → Tree

The `treeViewPrefs` parallel DB query (and its `loadTreeViewPrefsSafe` import) was also dropped since `TreeList` no longer appears on this page.

---

## 4. Tab Panel Detail — After

### Messages (global inbox)
```
Your Conversations                 [N new items since last visit]

┌─ [💬] Open Feed ──────────────────────────── [3 new] →  ┐
│  Family-wide posts and updates                            │
└───────────────────────────────────────────────────────────┘
┌─ [🔒] Private Feed ───────────────────────── [1 new] →  ┐
│  Trust unit conversations                                 │
└───────────────────────────────────────────────────────────┘
```
- Stream icons color-shift (grey → filled accent) when there are new items
- "N new" badge only shown when count > 0
- "All caught up" copy when vaultNewCount = 0

### Feed (family-wide posts)
```
Family Feed
Posts and updates shared across your family network.

[● 3 new posts since your last visit]   (blue pill, only if > 0)

[Rss] Open Family Feed →
```

### My Posts
```
My Timeline
Posts, photos, and updates you've shared with your family.

[User] View My Posts →  (link to /profile)
```

### Invites (invite activity)
```
Invite Activity   [2 pending]           + New invite →

recipient@email.com    May 3    [Pending]
other@email.com        Apr 28   [Registered]
...
```
- Empty state: Mail icon + "No invites sent yet" + "Invite someone" CTA button

### Family Safe (governed activity)
```
Family Safe
Your private family governance network — controlled circles,
trusted spaces, and guardian oversight.

✓ Private circles and trusted spaces
✓ Guardian approvals and oversight tools
✓ Controlled membership and visibility

[ShieldCheck] Open Family Safe →
```

---

## 5. What Was Not Changed

| Item | Reason |
|---|---|
| `DashboardContextRail` | Already correct: Family Tree list, Trust Units, Family Safe CTA |
| `ContextRailCard` | No changes needed |
| `DashboardTrustUnitGate` | No changes needed |
| Backend / schema / APIs | Mission prohibits changes |

---

## 6. Validation Results

```
npx tsc --noEmit  →  0 errors
npm run build     →  ✓ Compiled successfully
```
