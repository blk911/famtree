# Private Thread Source of Truth

**Agent:** 58 — Thread Data Convergence Plan  
**Status:** Architecture decision (planning only)

---

## Decision

**`AihMsgConversation` + `AihMsgParticipant` + `AihMsgMessage` are the single source of truth for all governed private/direct/group-thread communication.**

Dashboard **Private Threads** becomes a **read/write client** of Msg Vault APIs — not a parallel persistence layer.

---

## Why not legacy `Post` PRIVATE?

| Criterion | `Post` + `PostVisibility` | Msg Vault models |
|-----------|---------------------------|------------------|
| Governance at send | Weak / scope checks only (`userMayPostWithScope`) | `canMessage`, `assertCanSendMessage`, participant gates |
| Conversation identity | Derived client-side (`participantKey`, sorted IDs) | First-class `AihMsgConversation` + `directKey` |
| Read receipts / unread | Ad-hoc (`lastLoginAt` + post counts) | `AihMsgParticipant.lastReadAt` (ready to wire) |
| Thread vs direct | Heuristic (participant count) | `AihMsgConversationKind` |
| Trust unit binding | Implicit via member ID set | `trustUnitId` FK |
| Audit / explainability | None on post | `policySnapshot`, `AihMsgGovernanceEvent` |
| Product direction | Interim (Agent 48–49) | Target architecture |

Legacy posts remain valid for **broadcast** (`scope: FAMILY`, spaces) and historical archive. **`scope: PRIVATE` stops receiving new writes** after cutover.

---

## What stays on `Post`

- Dashboard **Posts** tab (family/network broadcast)
- **My Posts** (author-owned feed items)
- Comments/likes on broadcasts (engagement layer, not chat transcript)
- Optional: link from a broadcast post to a Msg Vault thread (“Discuss privately”)

---

## Canonical keys

| Thread shape | Legacy (dashboard) | Vault (authoritative) |
|--------------|-------------------|------------------------|
| Direct 1:1 | `directThreadKey(a,b)` = sorted UUID join | `AihMsgConversation.directKey` (unique) |
| Trust unit | `tuThreadKey(unit)` = sorted member IDs | `trustUnitId` + `kind: THREAD` |
| Custom group | `participantKey(visibility, author)` | `kind: THREAD`, participants = visibility ∪ author |

After migration, **dashboard selector keys map to vault IDs** via lookup table or API `conversationId` — not string keys alone.

---

## Write path rule (post-cutover)

```
User sends private message
  → POST /api/msg-vault/conversations/[id]/messages
  → sendMessage() with governance
  → NEVER POST /api/profile/posts scope=PRIVATE (new)
```

Read path rule:

```
User opens Private Threads tab
  → GET /api/msg-vault/conversations (+ optional legacy overlay during bridge)
  → GET /api/msg-vault/conversations/[id]/messages
```

---

## Open decision (Agent 59)

Whether to add **`AihMsgMessage.migratedFromPostId`** (nullable FK) vs store provenance only in `policySnapshot` / governance events. Recommendation: **dedicated nullable column** for idempotent migration and support queries.
