# Agent 109 — Msg Vault attachments + archive report

**Branch:** `msgvault-agent-109-attachments-archive`  
**Date:** 2026-05-22  
**Implementation commit:** `1f511d6` (`feat(msg-vault): Agent 109 archive chats + governed attachments`)

---

## Summary

Adds **per-member chat archive** (hide from active list, no delete) and **governed message attachments** (image / MP4 video / PDF) to Msg Vault without redesigning the Agent 107 shell.

---

## Mission conformance (traceability vs Agent 109 spec)

### Core rules — Do / Don’t

| Rule | Evidence |
|------|----------|
| Chats persist by default | No delete-message or conversation-delete endpoints added; archive only toggles viewer `archivedAt`. |
| Archive replaces “end chat” | **Archive chat** / **Resume chat** in header overflow (`ConversationThreadActions`); no separate “end” flow that removes threads. |
| Active list clean | `MsgVaultShell` splits `directConversations` vs `archivedDirectConversations`; archived only under **Archived** accordion. |
| Archived accessible | Selecting archived conversation loads messages; composer disabled until **Resume**. |
| Attachments governed | `resolveVaultAttachment` + existing `requireActiveParticipant` / `assertCanSendMessage`; uploads go through `uploadFile(..., "msg-vault")`. |
| No public DM | Msg Vault unchanged re: eligibility (trust/direct key); no inbox broadening introduced. |

| Do NOT | Respect |
|---------|---------|
| Delete existing messages | Not implemented (`removeMessage` unchanged for this epic). |
| Disappearing chats | Not implemented. |
| Open/public inboxes | Not implemented. |
| Redesign whole shell | Uses existing `Communication*` / list/center/context layout (Agent 107). |
| Alter TrustUnit governance | No edits to TU graph/policy core; Msg Vault consumes existing pathways. |

### Part 1 — Archive chat model

| Spec item | Implemented |
|-----------|--------------|
| Archive / Resume action (header overflow `…`) | `ConversationThreadActions` → `PATCH` archive/resume via `archiveVaultConversation` / `resumeVaultConversation`. Extra **Resume chat** banner in `ConversationPanel` when viewer archived. |
| Active rail: active only | Messages-based left rail excludes `archivedForViewer`; contacts row preserved. |
| **ARCHIVED (count)**, collapsed by default | `ArchivedChatsSection` with chevron toggle; collapsed initial state. |
| Compact rows: avatar, name, last activity | `ConversationListRow` for archived slice; trailing preview column = formatted last-activity date. Optional **msg count** — not wired (aggregate gap). |
| Open archived → Resume returns to active | Resume clears `archivedAt`; list state refresh via `MsgVaultShell` `onConversationUpdated`. |
| Lightweight persistent state, no hard delete | `AihMsgParticipant.archivedAt` only. |

### Part 2 — Attachments

| Spec item | Implemented |
|-----------|-------------|
| Image + paperclip, left of send row | `MessageComposer` `ThreadComposer` `footer`: `ImageIcon` + `Paperclip`; hidden `<input accept=…>` |
| JPG, PNG, WebP, MP4, PDF | Accepted in `MSG_VAULT_ATTACHMENT_ACCEPT` + `resolveVaultAttachment`. **DOC/DOCX** — intentionally **PDF-only** documents in v1 (see gaps). |
| Message rendering | `MessageAttachmentBubble`: image preview, `<video>` for video, compact link card for docs. |
| Governance | Same participant + `assertCanSendMessage` as text sends; blocked sends still audited where existing. |
| Upload states — uploading / failed / sent | **Uploading:** pending strip `"Uploading…"` + Send label `"Sending…"`. **Failed:** `MsgVaultApiError` / validation → `ThreadComposer` error banner; pending file retained. **Sent:** success clears composer and message renders in thread (no ghost bubble row). |
| Empty state | No attachment strip unless `pendingFile` set; composer unchanged. |

### Parts 3–5 + report

| Part | Implemented |
|------|----------------|
| **3 UI cleanup** | `MsgContextRail` trimmed to meta + participants; center dominates; archived section compressed vs active rows. |
| **4 Data** | `archivedAt`; `attachments` JSON array on messages; minimal Prisma surface. |
| **5 Validation** | `npm run typecheck` ✅ · `next build` ✅ (rerun locally after changes). Manual QA checklist below remains for human signer. |

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
