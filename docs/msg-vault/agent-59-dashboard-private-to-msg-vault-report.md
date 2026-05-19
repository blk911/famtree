# Agent 59 — Dashboard Private Threads → Msg Vault Store

**Branch:** `aihsafe-agent-59-dashboard-private-to-msg-vault`  
**Date:** 2026-05-19

---

## Summary

Dashboard **Private Threads** now reads and writes **Msg Vault** (`AihMsgConversation` / `AihMsgMessage`) via existing `/api/msg-vault/*` routes. Legacy `Post` `scope: PRIVATE` is no longer loaded or written from the dashboard path.

**No Prisma schema changes.** **No data migration.** Legacy private posts remain in the database but are **not shown** on the dashboard (per Agent 58 — no read-through bridge in this pass).

---

## Files modified

| File | Change |
|------|--------|
| `components/vault/DashboardPrivateThreadsContext.tsx` | **New** — fetch conversations, selection, open direct/TU |
| `components/vault/conversation-unread.ts` | **New** — unread dot from `lastReadAt` vs `lastMessageAt` |
| `components/vault/EmptyThreadState.tsx` | Added `no-threads` variant |
| `lib/msg-vault/api-client.ts` | Added `startThreadConversation()` |
| `components/dashboard/DashboardHubColumns.tsx` | Provider wrapper; empty legacy private posts |
| `components/dashboard/DashboardContextRail.tsx` | Vault conversation list + tree/TU open via vault APIs |
| `components/dashboard/DashboardPrivateThreadCenter.tsx` | Vault messages + `MessageComposer` |
| `app/(app)/dashboard/page.tsx` | Removed `getPrivateFeedPosts` / legacy DM unread |
| `components/dashboard/PrivateThreadsHub.tsx` | Same vault provider (family-vault private page) |

---

## Legacy data paths removed from Dashboard

| Removed | Was |
|---------|-----|
| `getPrivateFeedPosts(user.id)` in RSC | Server load of PRIVATE posts |
| `serializedPrivatePosts` → center | Client thread grouping from posts |
| `POST /api/profile/posts` `scope: PRIVATE` | Composer send |
| `DELETE /api/profile/posts` | Message delete in thread center |
| `dmUnreadByPeerFromPrivatePosts()` | Right-rail unread from post timestamps |

---

## Msg Vault APIs consumed

| Method | Route | Use |
|--------|-------|-----|
| GET | `/api/msg-vault/conversations` | Right-rail list |
| POST | `/api/msg-vault/conversations` | Start direct (`type: direct`) or TU thread (`type: thread`) |
| GET | `/api/msg-vault/conversations/[id]/messages` | Center message history |
| POST | `/api/msg-vault/conversations/[id]/messages` | Reply (`MessageComposer` / `sendVaultMessage`) |

Governance enforced server-side (`canMessage`, `assertCanSendMessage`) — unchanged.

---

## Send / reply behavior

- User selects a conversation (existing vault row or newly created direct/TU thread).
- `MessageComposer` posts `{ bodyText }` to vault messages API.
- Successful send appends `MsgMessageDTO` to local state; no `Post` row created.

Media attachments from the old post composer were **not** carried over (vault text-only in this pass).

---

## Empty state behavior

| State | UI |
|-------|-----|
| No vault conversations | `EmptyThreadState` `no-threads`: “No private threads yet.” + link copy to Msg Vault / trusted space |
| Conversations exist, none selected | `pick` variant |
| Selected, no messages | `no-messages` variant |

---

## Remaining legacy data gap

- **Historical PRIVATE (and FAMILY+visibility) posts** are not visible on Dashboard Private Threads until Agent 60 migration (or an explicit read-through bridge).
- **`/family-vault/private`** uses the same vault UI via `PrivateThreadsHub` — same gap.
- **Activity CTA badge** for Private Threads still uses `newCommentsCount` only (legacy DM unread removed from page).
- **Mark-read API** not wired after open — unread dots use participant `lastReadAt` when set; may show placeholder until read endpoint is added (Agent 59+ / roadmap).

---

## Validation

- `npm run typecheck` — pass
- `npm run build` — run in CI / clean environment (local Prisma generate may hit file lock on Windows)

---

## Next steps (Agent 60+)

1. Migration dry-run for legacy posts → vault  
2. Block `scope: PRIVATE` on profile posts API  
3. Wire `POST .../read` when available for accurate unread  
4. Optional compact `?view=dashboard` on conversations list
