# Agent 87 — Msg Vault empty direct chat / selection bug

**Date:** 2026-05-19  
**Reported on:** Production (`AMIHUMAN.NET`), user spencer wendt

## Symptoms

- Msg Vault left nav: **Chats (0)** on Overview; on Chats tab, **People** shows “No trusted conversations yet” when `allowedContacts` is empty.
- Center pane: **“Select a conversation.”** after attempting to open a chat (e.g. rhillk).
- Possible stuck **wait** cursor when a selection is made but the thread panel never binds to a conversation.

## Root cause

**Agent 80 stale guard** treated every conversation with `lastMessageAt === null` as `no_messages`, including **DIRECT** chats that were created but never messaged.

Effects:

1. `filterVisibleConversations` hid empty direct chats → **Chats (0)** even when a direct row existed in the DB.
2. `selectedConversation` was derived only from **visible** conversations, so `ConversationPanel` always saw `conversation === null` → empty “Select a conversation” state (loading state is skipped when `!conversation`).
3. A `useEffect` cleared `selectedId` whenever the id was not in `visibleConversations`, racing with `selectConversation` and wiping the selection right after open.

Contacts list is separate (`GET …/conversations?allowedContacts=1`). If that list is empty on prod, People stays empty even after this fix; opening via **Start a chat** modal or `?peer=` still hit the same selection bug when an `existingConversationId` existed.

## Fix

| File | Change |
|------|--------|
| `lib/msg-vault/conversation-display-guard.ts` | DIRECT: only stale for solo/missing participant; **do not** use `no_messages` on directs. Threads/spaces still use `no_messages`. |
| `components/msg-vault/MsgVaultShell.tsx` | `selectedConversation` from full `conversations` by `selectedId`; clear selection only when id missing from `conversations` and not `loadingMsgs`; upsert detail fetch into list; load allowed contacts on mount (not only when Chats tab active). |

## Verification

```bash
npx tsx scripts/msg-vault/verify-conversation-display-guard.ts
npm run typecheck
```

Manual:

1. Log in as a user with a governed contact and an **empty** direct conversation (no messages).
2. Msg Vault → Chats: contact appears; **Chats (n)** ≥ 1 if the conv is in the list payload.
3. Click contact: center shows **“No messages in this conversation yet.”** and composer is enabled.
4. Send a message: thread renders; count stays correct.

## Production follow-up (if People still empty)

If rhillk does not appear under People after deploy:

- Confirm `canMessage` / trust bond between spencer and rhillk (`listAllowedChatContacts` in `lib/msg-vault/conversations/allowed-contacts.ts`).
- Confirm both users `status === "active"`.
- Check network tab for `GET /api/msg-vault/conversations?allowedContacts=1` response `contacts` array.

Optional cleanup: empty direct rows are **intentionally visible** now; use `npm run msg-vault:cleanup-stale` only for solo/orphan threads, not new directs.
