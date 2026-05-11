# Agent 35 — Dashboard Restore + Feed Mount Repair

**Branch:** `aihsafe-agent-31-dashboard-vault-consolidation`
**Date:** 2026-05-11
**Scope:** Revert Agent 34's full feed component mounts (which broke layout/right rail), restore Agent 33 state, implement compact post preview cards instead.

---

## 1. Agent 34 Commit Identified

```
1b46b80  feat(dashboard): mount FamilyFeedClient + PrivateFeedClient + MyPostsMount in tab panels
```

---

## 2. Files Reverted

```
git revert 1b46b80 --no-edit
```

Reverted cleanly in commit `6d40e74`. Restored files:
- `components/dashboard/DashboardVaultTabs.tsx` → Agent 33 state
- `app/(app)/dashboard/page.tsx` → Agent 33 state
- Deleted `components/dashboard/MyPostsMount.tsx`
- Deleted `docs/aihsafe/agent-34-dashboard-posts-content-mount-report.md`

---

## 3. Layout Restored

After revert, confirmed Agent 33 layout:
- 4-col metric strip (TREE MEMBERS / INVITES SENT / JOINED VIA YOU / INVITE tile)
- 5-tab bar (Posts default, Pvt Feeds, My Posts, Invites, Family Safe)
- Right context rail (Family Tree, Trust Units, Family Safe CTA)
- Posts tab: activity banner + two full-width CTA buttons (placeholder state)
- Pvt Feeds tab: purple activity banner + "Open private feeds →" CTA
- My Posts tab: heading + description + "View My Posts →" link

---

## 4. Minimal Feed Preview Implemented

### Approach
- **No client-side fetching** — two small Prisma queries added to the existing `Promise.all` in `page.tsx`
- **No route-scale components** — no `FamilyFeedClient` / `PrivateFeedClient`
- **Compact inline cards** — max 4 public posts (Posts tab), max 3 own posts (My Posts tab)
- **"View full feed →" link** preserved at bottom of each panel

### `page.tsx` additions

Two new parallel fetches (minimal field selects):

```ts
// feedPreviewsRaw — up to 4 public posts
prisma.post.findMany({
  where: { visibility: { none: {} } },
  select: {
    id, body, createdAt,
    profile: { select: { user: { select: { firstName, lastName, photoUrl } } } },
  },
  orderBy: { createdAt: "desc" },
  take: 4,
})

// myPostPreviewsRaw — up to 3 of current user's posts
prisma.post.findMany({
  where: { profile: { userId: user.id } },
  select: { id, body, createdAt, _count: { select: { likes, comments } } },
  orderBy: { createdAt: "desc" },
  take: 3,
})
```

Serialized and passed as `feedPreviews` / `myPostPreviews` props to `DashboardVaultTabs`.

### `DashboardVaultTabs.tsx` changes

**Posts tab** — retained activity banner (🔥 / ✓), added compact preview cards:
- Author avatar (initials fallback), name, date, body snippet (≤88 chars)
- Dividers between cards
- "View family feed →" indigo gradient button at bottom (replacing the two old CTAs)

**My Posts tab** — replaced static heading+link with compact preview cards:
- Body snippet (≤80 chars), date, like/comment counts
- "View all posts →" + "✏️ New post" links at bottom
- Empty state preserved: heading + description + "Write your first post" CTA

**Pvt Feeds tab** — unchanged from Agent 33 (no simple API for private posts without full PrivateFeedClient)

**Invites tab** — unchanged

**Family Safe tab** — unchanged

---

## 5. Right Rail Restored

Right rail confirmed intact across all tab switches:
- Family Tree: 5 member names + "+2 more →" + "View →" link
- Trust Units: count chip + unit previews + "View →" link
- Family Safe CTA card

---

## 6. Visual Inspection

Inspected at `http://localhost:3000/dashboard` before committing:

| Check | Result |
|---|---|
| 4-col metric strip | ✓ intact |
| Tab bar (5 tabs, Posts default) | ✓ intact |
| Posts tab: activity banner | ✓ green "caught up" banner |
| Posts tab: compact preview card (ashlyn wendt · Apr 26) | ✓ visible |
| Posts tab: "View family feed →" button | ✓ visible |
| Pvt Feeds tab: purple banner + CTA | ✓ intact |
| My Posts tab: compact cards (2 posts shown) | ✓ visible |
| My Posts tab: "View all posts →" + "New post" links | ✓ visible |
| Right rail: Family Tree, Trust Units, Family Safe | ✓ fully visible |
| Sidebar nav | ✓ unchanged |

---

## 7. Validation Results

```
npx tsc --noEmit  →  0 errors
npx next build    →  ✓ Compiled successfully
```
