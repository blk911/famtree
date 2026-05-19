# Msg Vault — Schema & Type Contracts

**Agent:** 49 — Schema Foundation  
**Branch:** `aihsafe-agent-49-msg-vault-schema`

Reference for Prisma models, enums, TypeScript DTOs, and service stubs. Implementation routes/services: Agent 50+.

---

## Prisma models

| Model | Table | Purpose |
|---|---|---|
| `AihMsgConversation` | `aih_msg_conversations` | Governed direct chat or thread container |
| `AihMsgParticipant` | `aih_msg_participants` | Conversation membership + read cursor |
| `AihMsgMessage` | `aih_msg_messages` | Individual message body + governance flags |
| `AihMsgNotice` | `aih_msg_notices` | System/governance notices per user |
| `AihMsgGovernanceEvent` | `aih_msg_governance_events` | Communication-layer audit detail |

---

## Prisma enums

| Enum | Values |
|---|---|
| `AihMsgConversationKind` | `DIRECT`, `THREAD`, `NOTICE_THREAD`, `SPACE_THREAD` |
| `AihMsgConversationStatus` | `ACTIVE`, `ARCHIVED`, `LOCKED`, `PENDING_APPROVAL` |
| `AihMsgParticipantRole` | `OWNER`, `PARTICIPANT`, `OBSERVER`, `GUARDIAN`, `MODERATOR` |
| `AihMsgParticipantStatus` | `ACTIVE`, `LEFT`, `REMOVED`, `PENDING` |
| `AihMsgMessageStatus` | `SENT`, `PENDING_APPROVAL`, `REMOVED`, `BLOCKED` |
| `AihMsgNoticeKind` | `APPROVAL_REQUIRED`, `INVITE_ACCEPTED`, `MEMBER_JOINED`, `MEMBER_LEFT`, `POLICY_CHANGED`, `MESSAGE_BLOCKED`, `POST_APPROVED`, `POST_DENIED` |
| `AihMsgNoticeStatus` | `UNREAD`, `READ`, `ARCHIVED` |

String fields (not enums): `visibilityScope`, `governanceState`, `escalationState`, `eventType` — align with AIH Safe `VisibilityScope` and activity post conventions.

---

## Indexes

| Model | Index |
|---|---|
| `AihMsgConversation` | `createdById`, `trustUnitId`, `status`, `lastMessageAt DESC`, `(kind, status)` |
| `AihMsgConversation` | `directKey` **unique** (nullable — only DIRECT rows set) |
| `AihMsgParticipant` | `(conversationId, userId)` **unique**, `(userId, status)`, `(conversationId, status)` |
| `AihMsgMessage` | `(conversationId, createdAt DESC)`, `(authorId, createdAt DESC)`, `status` |
| `AihMsgNotice` | `(userId, status, createdAt DESC)`, `conversationId`, `trustUnitId`, `approvalRequestId` |
| `AihMsgGovernanceEvent` | `(conversationId, createdAt DESC)`, `messageId`, `(actorUserId, createdAt DESC)`, `eventType` |

---

## User / graph relations

`User` back-relations: conversations created, participants, messages authored, notices, governance events acted.

`TrustUnit` → `aihMsgConversations` (optional `trustUnitId` on conversation).

`AihApprovalRequest` → `aihMsgNotices` (optional `approvalRequestId`).

---

## TypeScript modules (`types/msg-vault/`)

| File | Exports |
|---|---|
| `conversation.ts` | `MsgConversationKind`, `MsgConversationStatus`, `MsgParticipantRole`, `MsgParticipantStatus`, `MsgConversationDTO`, `MsgParticipantDTO`, `CreateThreadConversationInput` |
| `message.ts` | `MsgMessageStatus`, `MsgMessageDTO`, `SendMessageInput` |
| `notice.ts` | `MsgNoticeKind`, `MsgNoticeStatus`, `MsgNoticeDTO`, `CreateNoticeInput` |
| `governance-overlay.ts` | `GovernanceOverlayDTO`, `RelationshipContextDTO`, `RelationshipEdgeDTO` |
| `index.ts` | Barrel re-export |

---

## Service stubs (`lib/msg-vault/`)

| Module | Functions |
|---|---|
| `conversations/index.ts` | `listConversationsForUser`, `getConversationById`, `createDirectConversation`, `createThreadConversation`, `listParticipants` |
| `messages/index.ts` | `listMessages`, `sendMessage`, `removeMessage` |
| `notices/index.ts` | `listNoticesForUser`, `markNoticeRead`, `createNotice` |
| `context/index.ts` | `buildGovernanceOverlay`, `explainConversationAccess` |
| `directKey.ts` | `makeDirectConversationKey` |
| `stub.ts` | `MSG_VAULT_NOT_IMPLEMENTED`, `msgVaultNotImplemented()` |

All stubs throw: `Not implemented — Msg Vault Agent 50 route/service pass.`

---

## Direct key strategy

```ts
makeDirectConversationKey(userA, userB) => [userA, userB].sort().join(",")
```

- Stored on `AihMsgConversation.directKey` when `kind = DIRECT`.
- `@unique` on `directKey` — PostgreSQL allows multiple `NULL` for thread kinds.
- Matches legacy `lib/private-thread-keys.ts` `directThreadKey()` for Post migration.

---

## Governance integration (Agent 50+)

Before any stub is implemented:

1. `buildActorContext(actorUserId)`
2. `resolvePolicyProfile(actorUserId)`
3. `canMessage()` for direct create
4. `enablePrivateThreads` for thread create
5. Persist `policySnapshot` on conversation create
6. `buildGovernanceOverlay()` reads snapshot + live graph

---

## Not implemented (this pass)

- API routes under `/api/msg-vault`
- UI (`app/(app)/msg-vault`)
- Message send/list DB logic
- Notice aggregation from legacy tables
- Migration from `Post` PRIVATE threads
- `MessagingPolicy` JSON on `AihPolicyProfile`
