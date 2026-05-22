# Agent 109 — Msg Vault attachments + archive report

**Branch:** `msgvault-agent-109-attachments-archive`  
**Date:** 2026-05-22

---

## Summary

Adds **per-member chat archive** (hide from active list, no delete) and **governed message attachments** (image / MP4 video / PDF) to Msg Vault without redesigning the Agent 107 shell.

---

## Schema changes (minimal)

| Model | Field | Purpose |
|-------|--------|---------|
| `AihMsgParticipant` | `archivedAt DateTime?` | Per-user archive (not global conversation delete) |
| `AihMsgMessage` | `attachments Json?` | Attachment metadata array on message |

**Deploy:** `npm run db:push` then `npm run db:generate` (restart dev server after generate).

---

## Archive flow

1. User opens **⋯** in conversation header → **Archive chat**.
2. `PATCH /api/msg-vault/conversations/[id]` `{ "action": "archive" }` sets `archivedAt` on the viewer’s participant row.
3. Chat leaves **active** left rail; appears under **ARCHIVED (n)** (collapsed by default).
4. Click archived row → opens thread (read-only composer until resumed).
5. **Resume chat** (banner button or menu) clears `archivedAt` → returns to active list.

**Not used:** global `AihMsgConversation.status = ARCHIVED` for member hide (that status remains for governance lock). List still returns archived chats with `archivedForViewer: true`.

---

## Attachment flow

1. Composer **image** / **paperclip** triggers hidden file inputs (`MSG_VAULT_ATTACHMENT_ACCEPT`).
2. `POST …/messages` `multipart/form-data` with `file` + optional `bodyText`.
3. Server: `resolveVaultAttachment` → `uploadFile(..., "msg-vault", …)` → `sendMessage` with JSON attachments on row.
4. UI renders inline image, video player, or PDF file card in message bubble.

**Governance:** Same `assertCanSendMessage` / participant checks as text; minors blocked when posting policy disallows messaging.

---

## Files modified

| Area | Files |
|------|--------|
| Schema | `prisma/schema.prisma` |
| Types | `types/msg-vault/attachment.ts`, `message.ts`, `conversation.ts`, `index.ts` |
| Services | `lib/msg-vault/conversations/archive.ts`, `conversations/index.ts`, `messages/index.ts`, `attachments.ts`, `mappers.ts` |
| Storage | `lib/storage/index.ts` (`msg-vault` folder) |
| API | `app/api/msg-vault/conversations/[conversationId]/route.ts` (PATCH), `…/messages/route.ts` (multipart) |
| Client API | `lib/msg-vault/api-client.ts` |
| UI | `MessageComposer.tsx`, `ConversationPanel.tsx`, `ConversationThreadActions.tsx`, `MessageAttachmentBubble.tsx`, `ConversationListPanel.tsx`, `MsgVaultShell.tsx`, `MsgContextRail.tsx`, `ThreadComposer.tsx` |
| Copy | `lib/product/communication-copy.ts` |

---

## UI cleanup (Part 3)

- **Right rail (“Chat”):** Type, visibility, and policy summary only—no duplicate thread title paragraph (matches center heading).
- **Center:** Messages, attachments, composer remain dominant.
- **Left rail:** Active chats first; **Archived** accordion at bottom; archived rows reuse `ConversationListRow` (avatar, name, last-activity preview on right).

---

## Remaining gaps

| Item | Notes |
|------|--------|
| Thread archive | Archive menu on direct chats; threads can use same API but no separate archived UI section for threads tab yet. |
| Message count in archived rows | Optional per spec — not implemented (would need aggregate query); row shows last activity preview instead. |
| Multiple attachments per message | API supports array; UI sends one file per message. |
| DOCX | Only PDF for documents in v1. |
| Optimistic upload rows | Upload state shown in composer pending strip, not as ghost message bubble. |
| Production DB | Run `db:push` on Neon before deploy (schema fields). |

---

## Validation

| Check | Result |
|-------|--------|
| `npm run typecheck` | Pass |
| `npm run db:push` (local) | Pass |
| `npx next build` | Pass (after clean `.next`) |

### Manual QA

- [ ] Send text message  
- [ ] Attach JPG / PDF / MP4  
- [ ] Archive chat → leaves active list  
- [ ] Expand **ARCHIVED** → open → **Resume**  
- [ ] Verify composer disabled while archived  
- [ ] Context rail shows short policy lines only  

---

## Related

- `docs/product/communication-model.md` — Posts vs chats vs messages  
- `docs/msg-vault/agent-107-ig-shell-report.md` — Shell layout  
