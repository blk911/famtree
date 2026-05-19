# Legacy Private Post → Msg Vault Migration Map

**Agent:** 58 — Thread Data Convergence Plan  
**Status:** Planning only — no migration executed

---

## Eligibility: which `Post` rows migrate?

Include a post when **all** of the following hold:

1. `Post.scope = 'PRIVATE'` **OR** (`scope = 'FAMILY'` AND at least one `PostVisibility` row exists)
2. `PostVisibility` count ≥ 1 (empty visibility = broadcast, out of scope)
3. Post body is non-empty OR has `imageUrl` (media: see risks — attachments may need blob URL copy)
4. Author profile resolves to active `User`

Exclude:

- `scope` in `BUSINESS` | `CLUB` | `CHURCH` (space posts)
- Deleted/hidden posts if soft-delete is introduced later (today hard delete only)
- Admin test spam marked for removal (operational, pre-migration cleanup)

---

## Conversation grouping (legacy → vault)

Legacy grouping logic lives in `components/dashboard/private-thread-model.ts` (`buildPrivateThreads`). Migration **must use the same algorithm** before insert:

```ts
participantKey(visibilityIds, authorId) =
  sort(unique([...visibilityIds, authorId])).join(",")
```

| Legacy thread type | Detection | Vault `kind` | Vault identity |
|-------------------|-----------|--------------|----------------|
| Direct | `memberIds.length === 2` (incl. author) | `DIRECT` | `directKey = makeDirectConversationKey(u1, u2)` |
| Trust unit | Key matches `tuThreadKey(unit)` for an active TU | `THREAD` | `trustUnitId = unit.id`, title from TU meta |
| Group | 3+ participants, not a TU key | `THREAD` | `directKey = null`, title = participant names |

---

## Field mapping table

| Legacy source | Vault target | Notes |
|---------------|--------------|-------|
| `Post` (thread container) | `AihMsgConversation` | One conversation per derived thread key |
| `Post.profile.userId` + `PostVisibility.userId[]` | `AihMsgParticipant` | Union of all authors + visibility users across posts in thread |
| `Post.body` | `AihMsgMessage.bodyText` | One message per post; preserve order by `createdAt` ASC |
| `Post.imageUrl` | `AihMsgMessage` attachment strategy TBD | Phase 1: append URL in body or separate attachment table later |
| `Post.createdAt` | `AihMsgMessage.createdAt` | Use `$executeRaw` or Prisma create with explicit timestamps |
| `Post.updatedAt` | `AihMsgMessage.updatedAt` | Same as created unless edited (rare) |
| `Post.id` | `AihMsgMessage.migratedFromPostId` (proposed) | Idempotency key |
| `Post.title` | Ignored or prefixed in first message | Chat messages rarely have titles |
| `Like` / `Comment` on private post | **Not migrated** in v1 | Optional v2: comments → thread messages with quote ref |
| `Post.scope` | `policySnapshot.legacyScope` | Audit only |
| TU members (full unit) | `trustUnitId` on conversation | Only when thread classified as TU |

---

## Participant roles

| User | Role |
|------|------|
| First message author in thread (or conversation creator heuristic) | `OWNER` |
| All other active participants | `PARTICIPANT` |
| Guardian observers | **Not auto-added** in v1 (differs from Family Safe overlay) |

`joinedAt` = earliest message timestamp for that user in thread.  
`lastReadAt` = null (everyone sees migrated history as unread) **or** backfill from viewer `lastLoginAt` (product choice).

---

## Timestamps on conversation

| Field | Value |
|-------|-------|
| `lastMessageAt` | Max `Post.createdAt` in thread |
| `createdAt` | Min `Post.createdAt` in thread |
| `updatedAt` | `lastMessageAt` |
| `createdById` | Author of earliest post |

---

## Idempotency keys

| Mechanism | Purpose |
|-----------|---------|
| `AihMsgConversation.directKey` | UNIQUE — prevents duplicate DIRECT conversations |
| `@@unique([conversationId, userId])` on participant | Prevents duplicate membership |
| **`migratedFromPostId` on message** (proposed Agent 59) | UNIQUE nullable — one vault message per legacy post |
| `policySnapshot.migration` JSON | `{ version: 1, legacyThreadKey, postIds: [...] }` |
| `AihMsgGovernanceEvent` `eventType: LEGACY_POST_IMPORTED` | Audit trail per post |

**Re-run safety:** Migration script skips any `Post.id` already present in `migratedFromPostId`. Skips conversation create if `directKey` exists (merge messages into existing).

---

## Ordering algorithm (per thread)

1. Compute legacy thread key for each eligible post.
2. Group posts by key.
3. For each group:
   - Upsert conversation (by `directKey` or `trustUnitId` + kind).
   - Upsert participants (all user IDs in group).
   - For each post in group sorted by `createdAt ASC`:
     - Insert message if `migratedFromPostId` not exists.
4. Update `conversation.lastMessageAt`.

---

## Direct key mismatch cases

| Case | Resolution |
|------|------------|
| Legacy key uses 2 users, vault direct already exists | Append messages to existing conversation |
| Legacy group key, vault has DIRECT with same 2 users | Keep separate — keys differ |
| TU roster changed since old posts | Prefer current TU membership for new THREAD; legacy posts keep historical participant union |
| `FAMILY` + visibility legacy posts | Migrate using same participant key rules |

---

## Post-migration legacy posts

- Rows remain in `posts` table (read-only archive).
- Optional `Post.migratedAt` / tag in `policySnapshot` (future schema).
- Dashboard stops querying `getPrivateFeedPosts()` for active UI after Agent 61.
