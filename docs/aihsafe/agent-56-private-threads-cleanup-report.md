# Agent 56 — Private Threads Cleanup / Right Rail Chat Selector

## Files modified

| File | Change |
|------|--------|
| `components/dashboard/private-thread-model.ts` | **New** — thread grouping helpers (`buildPrivateThreads`, `tuThreadKey`, types) |
| `components/dashboard/DashboardPrivateThreadCenter.tsx` | **New** — center column: empty state or single-thread composer + messages |
| `components/dashboard/DashboardVaultTabs.tsx` | Private Threads tab uses center panel only; removed notice banners and `PrivateFeedClient` |
| `components/dashboard/DashboardHubColumns.tsx` | `activePrivateThreadKey` state; wires center + right rail |
| `components/dashboard/DashboardContextRail.tsx` | Inline chat rows for family, bond peers, trust units; selection highlight |
| `app/globals.css` | Styles for empty state, thread panel, right-rail selector rows |
| `docs/aihsafe/agent-56-private-threads-cleanup-report.md` | This report |

**Not modified:** `components/PrivateFeedClient.tsx` (still used on non-dashboard routes), Posts tab, schema, APIs.

## Center clutter removed

- Removed “Select a member on the right…” / new-conversation notice strip above the feed.
- Removed `PrivateFeedClient` accordion list from the dashboard Private Threads tab (including “New private message” accordion and full people/conversation list in the center).
- Center now shows only:
  - **No selection:** warm empty state — “Choose someone from the right to open a private thread.”
  - **Selection:** thread header, compose box, and messages for that thread only.

## Right rail selector behavior

- **Family Tree** (top 5 + bond peers not already shown): name row + chat icon; unread count badge when `dmUnreadByPeerId` has a value; gray dot placeholder when zero.
- **Trust Units:** TU header opens group thread; each member row opens a direct thread (chat icon + status).
- **Msg Vault** CTA unchanged in purpose; link aligned to `/msg-vault`.
- Clicking a row calls `onSelectPrivateThread(threadKey)`, switches to Private Threads tab, and highlights the active row (`dashboard-private-thread-rail-row--active` / `dashboard-private-thread-rail-tu--active`).

## Selected thread behavior

- Hub owns `activePrivateThreadKey` (canonical participant key or TU key).
- Center resolves the thread from live posts + trust units + bond peers; synthesizes an empty direct/TU thread when the key is valid but has no posts yet.
- Compose/send/delete reuse existing `/api/profile/posts` private-scope flow (same as `PrivateFeedClient`).
- `launchDmPeerId` path removed from hub; rail selection sets the key directly.

## Validation

- `npm run typecheck` — pass
- `npm run build` — pass

## Remaining gaps

- **Group threads** (3+ participants, non-TU) are not listed in the right rail; only open if already present in post data (no center list to pick them).
- **Family tree “+N more”** still links to `/tree` rather than expanding the selector.
- **Unread dots** for TU group threads are not aggregated (only per-peer `dmUnreadByPeerId`).
- **Mobile:** right rail stacks below center; user must scroll to pick a contact when the rail is off-screen.
- **PrivateFeedClient** on other pages unchanged; behavior may diverge slightly from dashboard until those routes adopt the same pattern.
