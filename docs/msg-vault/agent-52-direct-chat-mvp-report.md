# Agent 52 — Msg Vault Direct Chat MVP Report

**Date:** 2026-05-19  
**Branch:** `aihsafe-agent-52-direct-chat-mvp`  
**Status:** Complete

---

## Files changed

| Path | Change |
|---|---|
| `lib/msg-vault/conversations/allowed-contacts.ts` | **New** — governed contact discovery |
| `lib/msg-vault/conversations/index.ts` | Re-export `listAllowedChatContacts` |
| `lib/msg-vault/context/index.ts` | `explainDirectChatBetween` for context rail |
| `app/api/msg-vault/conversations/route.ts` | `GET ?allowedContacts=1` |
| `lib/msg-vault/api-client.ts` | `fetchAllowedChatContacts`, `startDirectConversation` |
| `components/msg-vault/StartChatModal.tsx` | **New** — Start chat UI |
| `components/msg-vault/MsgVaultShell.tsx` | Wire modal + list refresh |
| `components/msg-vault/ConversationList.tsx` | Empty-state Start chat CTA |

---

## Start chat behavior

1. User opens **Chats** tab → **+ Start chat** (header or empty list).
2. Modal loads `GET /api/msg-vault/conversations?allowedContacts=1`.
3. User may **filter by name** within the allowed list only (not network search).
4. Picking a contact calls `POST /api/msg-vault/conversations` with `{ type: "direct", targetUserId }`.
5. Service uses existing `directKey` — **opens existing** conversation if present.
6. Shell merges conversation into list, selects it, loads messages + governance overlay.
7. Composer sends messages via existing POST messages route.

---

## Allowed contact sources

Candidates collected server-side, then filtered with `canMessage()`:

| Source | Label |
|---|---|
| Guardian relationships | Your guardian / family you guard |
| Trust unit co-members | Shared trust: {unit name} |
| Relationship edges | Approved family connection |
| Invite tree | Invited by you, inviter, siblings, extended branch |

Only **active** users passing `canMessage()` are returned. No email lookup. No arbitrary user IDs.

---

## Governance checks

| Layer | Check |
|---|---|
| Contact list | `buildActorContext` + `canMessage()` per candidate |
| Create / open | `createDirectConversation` (unchanged) — `directKey` dedupe |
| Send message | `assertCanSendMessage` (unchanged) |
| Context rail | `explainDirectChatBetween` — shows primary relationship reason |

---

## Validation results

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ Clean |
| `npm run build` | _(run locally; stop dev server if Prisma EPERM)_ |

---

## Not in scope

- Thread creation UI  
- Public / email search  
- Creating contacts outside trust graph  
