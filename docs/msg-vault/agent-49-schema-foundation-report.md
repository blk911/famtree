# Agent 49 — Msg Vault Schema Foundation Report

**Date:** 2026-05-19  
**Branch:** `aihsafe-agent-49-msg-vault-schema`  
**Status:** Complete (schema + contracts + stubs only)

---

## 1. Files created

| Path |
|---|
| `types/msg-vault/index.ts` |
| `types/msg-vault/conversation.ts` |
| `types/msg-vault/message.ts` |
| `types/msg-vault/notice.ts` |
| `types/msg-vault/governance-overlay.ts` |
| `lib/msg-vault/directKey.ts` |
| `lib/msg-vault/stub.ts` |
| `lib/msg-vault/conversations/index.ts` |
| `lib/msg-vault/messages/index.ts` |
| `lib/msg-vault/notices/index.ts` |
| `lib/msg-vault/context/index.ts` |
| `docs/msg-vault/schema-contracts.md` |
| `docs/msg-vault/agent-49-schema-foundation-report.md` |

## 2. Files modified

| Path | Change |
|---|---|
| `prisma/schema.prisma` | 5 models, 7 enums, `User` / `TrustUnit` / `AihApprovalRequest` back-relations |

**Not modified:** `types/index.ts`, `lib/index.ts` (no project barrels), dashboard, Family Safe, governance kernel, auth.

---

## 3. Prisma models added

1. `AihMsgConversation`
2. `AihMsgParticipant`
3. `AihMsgMessage`
4. `AihMsgNotice`
5. `AihMsgGovernanceEvent`

---

## 4. Prisma enums added

1. `AihMsgConversationKind`
2. `AihMsgConversationStatus`
3. `AihMsgParticipantRole`
4. `AihMsgParticipantStatus`
5. `AihMsgMessageStatus`
6. `AihMsgNoticeKind`
7. `AihMsgNoticeStatus`

---

## 5. Indexes added

See `schema-contracts.md`. Highlights:

- Participant lookup: `(userId, status)`
- Conversation inbox sort: `lastMessageAt DESC`
- Message history: `(conversationId, createdAt DESC)`
- Notice inbox: `(userId, status, createdAt DESC)`
- Direct pair uniqueness: `directKey @unique`

---

## 6. DTO / contracts added

- `MsgConversationDTO`, `MsgParticipantDTO`, `CreateThreadConversationInput`
- `MsgMessageDTO`, `SendMessageInput`
- `MsgNoticeDTO`, `CreateNoticeInput`
- `GovernanceOverlayDTO`, `RelationshipContextDTO`, `RelationshipEdgeDTO`
- Const maps for all kind/status/role enums (mirrors Prisma enums)

---

## 7. Service stubs added

| Service | Stub count |
|---|---|
| Conversations | 5 |
| Messages | 3 |
| Notices | 3 |
| Context | 2 |

---

## 8. Direct key helper behavior

`makeDirectConversationKey(userA, userB)` sorts UUIDs lexicographically and joins with `,`. Identical to legacy dashboard `directThreadKey`. Used for `AihMsgConversation.directKey` on `DIRECT` conversations only.

---

## 9. Validation results

| Check | Result |
|---|---|
| `npm run db:push` | ✅ Schema synced to local Postgres |
| `npm run typecheck` | ✅ `tsc --noEmit` clean |
| `npm run build` | ⚠️ `prisma generate` EPERM on Windows (query engine DLL locked — stop `npm run dev` and re-run `npm run build`) |

---

## 10. What is NOT implemented yet

- Routes: `app/(app)/msg-vault/*`, `app/api/msg-vault/*`
- UI shell and dashboard link update
- DB-backed conversation/message/notice services
- Governance enforcement on create/send (`canMessage`, policy profile)
- Legacy `Post` PRIVATE thread migration
- Unread counts in `getVaultNotificationCount`
- Attachments, reactions, search, public discovery

---

## 11. Next recommended agent

**Agent 50 — Route foundation** (`aihsafe-agent-50-msg-vault-routes`):

- `app/(app)/msg-vault/layout.tsx` + role-aware tab stubs
- `middleware.ts` protect `/msg-vault`
- No message sending yet; pages may call stubs and show “coming soon” or empty states

Then **Agent 51** UI shell + dashboard link fix + Family Safe title rename.

---

## Design notes

- `policySnapshot` on conversation supports “why could you see this at creation time?” without re-running full policy merge on every read.
- `AihMsgGovernanceEvent` complements `AihAuditEvent` with conversation/message FKs for Msg Vault-specific forensics.
- `GUARDIAN` participant role supports observer/oversight without being the message author.
- `PENDING_APPROVAL` conversation status aligns with minor contact / thread escalation flows from Agents 45–46.
