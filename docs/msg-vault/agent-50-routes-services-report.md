# Agent 50 — Msg Vault Routes + Services Report

**Date:** 2026-05-19  
**Branch:** `aihsafe-agent-50-msg-vault-routes`  
**Status:** Complete (backend only — no UI)

---

## 1. Files created

| Path |
|---|
| `app/api/msg-vault/conversations/route.ts` |
| `app/api/msg-vault/conversations/[conversationId]/route.ts` |
| `app/api/msg-vault/conversations/[conversationId]/messages/route.ts` |
| `app/api/msg-vault/notices/route.ts` |
| `app/api/msg-vault/notices/[noticeId]/read/route.ts` |
| `lib/msg-vault/errors.ts` |
| `lib/msg-vault/mappers.ts` |
| `lib/msg-vault/access.ts` |
| `lib/msg-vault/policy.ts` |
| `lib/msg-vault/graph.ts` |
| `lib/msg-vault/route-utils.ts` |
| `docs/msg-vault/msg-vault-route-map.md` |
| `docs/msg-vault/agent-50-routes-services-report.md` |

## 2. Files modified

| Path |
|---|
| `lib/msg-vault/conversations/index.ts` |
| `lib/msg-vault/messages/index.ts` |
| `lib/msg-vault/notices/index.ts` |
| `lib/msg-vault/context/index.ts` |

**Not modified:** `prisma/schema.prisma`, auth, dashboard, Family Safe UI, governance kernel.

---

## 3. Services implemented

| Module | Functions |
|---|---|
| `conversations` | `listConversationsForUser`, `getConversationById`, `createDirectConversation`, `createThreadConversation`, `listParticipants` |
| `messages` | `listMessages`, `sendMessage`, `removeMessage`, `recordBlockedMessageAttempt` |
| `notices` | `listNoticesForUser`, `markNoticeRead`, `createNotice` (internal) |
| `context` | `buildGovernanceOverlay`, `explainConversationAccess`, `buildRelationshipContext`, `getConversationDetailForViewer` |

Supporting: `access.ts`, `policy.ts`, `graph.ts`, `mappers.ts`, `directKey.ts` (unchanged).

---

## 4. Routes implemented

See `msg-vault-route-map.md`.

---

## 5. Governance gates

| Action | Gate |
|---|---|
| Create direct | `buildActorContext` + `sharedTrustUnitIdsBetween` + `canMessage()` |
| Create thread | TU membership + `enablePrivateThreads` + all participants in TU |
| List / read | Active `AihMsgParticipant` |
| Send message | Active participant + conversation not `ARCHIVED`/`LOCKED`/`PENDING_APPROVAL` + `assertCanSendMessage()` |
| Blocked send | `MsgVaultError` 422 → optional `recordBlockedMessageAttempt` + `MESSAGE_BLOCKED` notice |
| Mark notice read | `notice.userId === caller` |

---

## 6. Known limitations

| Limitation | Notes |
|---|---|
| Messaging policy | Uses `ResolvedPolicyProfile.posting` as proxy — no `MessagingPolicy` JSON yet |
| Minor post escalation | Messages send immediately — no `PENDING_APPROVAL` message state / guardian queue |
| Guardian content read | Overlay flag only — no guardian message content API |
| NOTICE_THREAD kind | Schema supports; not created by routes yet |
| Legacy Post threads | Dashboard `PrivateFeedClient` still uses `Post` model |
| `removeMessage` | Service only — no DELETE route |
| Real-time | Polling only — no WebSocket |
| Notice aggregation | Does not auto-sync from `AihApprovalRequest` — manual `createNotice` for blocks |

---

## 7. Validation results

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ `tsc --noEmit` clean |
| `npm run build` | ⚠️ `prisma generate` EPERM on Windows if dev server locks query engine — stop `npm run dev`, re-run `npm run build` |

---

## 8. Next recommended agent

**Agent 51 — UI shell** (`aihsafe-agent-51-msg-vault-shell`):

- `/msg-vault` layout + internal tabs
- Point dashboard Msg Vault link to `/msg-vault`
- Rename `/aihsafe` page title to Family Safe

---

## Response shapes (examples)

**GET conversations:** `{ ok: true, data: { items: MsgConversationDTO[] } }`

**GET conversation detail:** `{ ok: true, data: { conversation, participants, governanceOverlay } }`

**GET messages:** `{ ok: true, data: { items, pagination: { cursor, hasMore, total: null } } }`
