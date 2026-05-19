# Agent 61 — Dashboard / Msg Vault QA After Store Switch

**Branch:** `aihsafe-agent-61-msg-vault-switch-qa`  
**Date:** 2026-05-19

---

## Summary

QA pass on the Agent 59 Msg Vault store switch. Fixed small bugs in message ordering, error surfacing, and conversation list updates after send. No schema changes, no migration, no new features.

---

## Files modified

| File | Fix |
|------|-----|
| `components/dashboard/DashboardPrivateThreadCenter.tsx` | Message prepend + chronological sort; fetch errors with retry; `limit=100` |
| `components/vault/DashboardPrivateThreadsContext.tsx` | `recordMessageSent`; clear errors on select/open |
| `components/vault/vault-message-order.ts` | **New** — shared sort/prepend helpers |
| `components/vault/VaultInlineError.tsx` | **New** — alert + Try again |
| `components/dashboard/DashboardContextRail.tsx` | Show vault errors in Private Threads card |
| `lib/msg-vault/api-client.ts` | Optional `limit` on `fetchMessages` |
| `components/msg-vault/ConversationPanel.tsx` | Use chronological sort (consistent with dashboard) |

---

## Flows tested (code review + local validation)

| # | Flow | Result |
|---|------|--------|
| 1 | Dashboard loads conversations from `GET /api/msg-vault/conversations` | Pass — `DashboardPrivateThreadsProvider` |
| 2 | Right rail opens direct (list + Family Tree) | Pass — `selectConversation` / `openDirectPeer` |
| 3 | Right rail opens trust-unit thread | Pass — `openTrustUnit` |
| 4 | Center sends via `MessageComposer` → vault POST | Pass |
| 5 | Messages persist after refresh | Pass — stored in vault; reload via `fetchMessages` |
| 6 | Empty states | Pass — `no-threads` / `pick` / `no-messages` |
| 7 | Msg Vault shows same conversations | Pass — same API; sort helper aligned |
| 8 | No legacy private post writes in Private Threads center | Pass — no `POST /api/profile/posts` PRIVATE in center |
| 9 | No accordion in private threads UI | Pass — none in dashboard private path |
| 10 | Friendly errors on fetch/send | Pass — `VaultInlineError` + `MessageComposer` errors |

---

## Bugs fixed

1. **New messages appeared at top of thread (wrong order)** — API returns newest-first; dashboard appended on send. Fixed with `prependVaultMessage` + `sortMessagesChronological`.
2. **Conversation list not updated after send** — Added `recordMessageSent` to bump `lastMessageAt` in context.
3. **Fetch failures showed generic empty state** — Distinguish load error vs empty; show retry.
4. **Rail errors invisible** — Open-direct/TU failures only in context; now shown in right-rail Private Threads card.
5. **Message history capped at 20** — Dashboard fetch uses `limit=100`.

---

## Remaining gaps (not fixed — out of scope)

- Legacy PRIVATE posts still hidden until migration (`--apply` on Agent 60 script).
- Private Threads CTA badge uses `newCommentsCount` only (legacy DM unread removed).
- Mark-read API not wired — unread dots are approximate.
- `DashboardPostComposer` still supports `scope: PRIVATE` for other surfaces (not Private Threads tab).
- Threads with 100+ messages need pagination (both dashboard and Msg Vault).

---

## Validation

| Check | Result |
|-------|--------|
| `npm run typecheck` | Pass |
| `npm run build` / `npx next build` | Pass |
