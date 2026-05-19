# Agent 55 — Dashboard Activity CTA Strip Report

## Summary

Replaced the decorative top metric strip (My Family, Invites Sent, Joined Via You, Invite) with a full-width **activity CTA strip** that surfaces what changed since last login and switches the dashboard tab on click.

## Files modified

| File | Change |
|------|--------|
| `components/dashboard/DashboardActivityCtaStrip.tsx` | **New** — four CTA cards |
| `components/dashboard/DashboardMemberLayout.tsx` | **New** — shared tab state + CTA above hub |
| `components/dashboard/DashboardHubColumns.tsx` | Tab state lifted to parent (controlled) |
| `components/dashboard/DashboardPostsPanel.tsx` | Removed green caught-up banner; warmer empty state |
| `app/(app)/dashboard/page.tsx` | Removed static metric strip; uses `DashboardMemberLayout` |
| `app/globals.css` | `.dashboard-activity-cta*` grid and card styles |

## CTA cards added

| Card | Status examples | Action text |
|------|-----------------|-------------|
| **Posts** | `3 new` / `All caught up` | See family activity |
| **Private Threads** | `2 new` / `All clear` | Open trusted conversations |
| **Invites** | `2 pending` / `No pending` | Review invite activity |
| **Msg Vault** | `Needs review` / `All clear` | Check governance notices / Open governed messages |

Urgent styling (amber border/background) when count &gt; 0 (or vault needs review).

## Counts / data sources

| Signal | Source |
|--------|--------|
| `newPostsCount` | `prisma.post` since `lastLoginAt`, not authored by viewer (`dashboard/page.tsx`) |
| `privateThreadsCount` | `max(newCommentsCount, sum(dmUnreadByPeerId))` — comments since last login vs. new private DM posts per peer |
| `pendingInvitesCount` | `invites.filter(status === "PENDING")` |
| `vaultNotificationCount` | `getVaultNotificationCount()` — trust gate, guardian approvals, TU invites |

No new APIs or schema.

## Click-to-tab behavior

- **Posts / Private Threads / Invites** → `setTab(...)` on shared `DashboardTabId` (same as tab bar).
- **Msg Vault** → `router.push("/msg-vault")` (tab bar already links out; no inline vault panel).
- Active CTA gets `--active` border when its tab matches.

## Removed redundant UI

- Top strip: My Family, Invites Sent, Joined Via You, Invite (external links).
- Green **“You’re caught up”** banner inside Posts when `newPostsCount === 0` (CTA Posts card shows “All caught up”).
- Fire-emoji new-posts banner still shows when `newPostsCount > 0`.

## Remaining count limitations

1. **Private Threads** uses `max(comments, dmUnread)` — does not sum both; may under-count if both signals fire.
2. **`dmUnreadByPeerId`** counts new private *posts* in 1:1 threads, not comment replies.
3. **`newCommentsCount`** is global comments since last login, not only private-thread comments.
4. **Msg Vault** count excludes unread Msg Vault notice rows (still 0 in `getVaultNotificationCount`).
5. **Empty Posts copy** shows when the feed list is empty, not only when there are zero *new* posts.

## Validation

- `npm run typecheck` — pass
- `npm run build` — pass
