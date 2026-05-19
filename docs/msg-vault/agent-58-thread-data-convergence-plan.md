# Agent 58 — Private Thread Data Convergence Plan

**Branch:** `aihsafe-agent-58-thread-data-convergence-plan`  
**Date:** 2026-05-19  
**Status:** Planning / architecture only — **no product code, schema, or API changes in this pass**

---

## Executive summary

Agent 57 aligned **UI** (center = active thread, right rail = selector). Agent 58 defines how to align **data**: Msg Vault (`AihMsgConversation` / `AihMsgMessage`) becomes the only write path and authoritative read path for private conversations; dashboard Private Threads becomes a thin view over the same APIs.

**Recommended bridge:** **Option C (hybrid)** — read legacy posts during transition, write new messages only to Msg Vault, run idempotent backfill migration, then switch dashboard reads and retire `scope: PRIVATE` writes.

---

## 1. Current state map

### 1.1 Dashboard Private Threads — read path

| Step | Location | Behavior |
|------|----------|----------|
| Server load | `app/(app)/dashboard/page.tsx` | `getPrivateFeedPosts(user.id)` |
| Query | `lib/posts/queries.ts` | Merges PRIVATE posts (received + mine) + legacy FAMILY posts with visibility |
| Serialize | `serializeDashboardPost()` | ISO dates for client |
| Client grouping | `components/dashboard/private-thread-model.ts` | `buildPrivateThreads()` → `tu` \| `direct` \| `group` |
| Thread key | `participantKey(vis, author)` / `tuThreadKey` / `directThreadKey` | Sorted UUID fingerprints (client-only) |
| UI | `DashboardPrivateThreadCenter` + `DashboardContextRail` | Selector by `activePrivateThreadKey` (string key, not vault ID) |
| Also | `app/(app)/family-vault/private/page.tsx` | Same data via `PrivateFeedClient` → `PrivateThreadsHub` |

**Participants inferred:** Union of `PostVisibility.userId` + `Post.profile.user.id` per post; TU threads seeded from `getTrustUnits()` even with zero posts.

### 1.2 Dashboard Private Threads — write path

| Step | Location | Behavior |
|------|----------|----------|
| Compose | `DashboardPrivateThreadCenter` | Local state + `POST /api/profile/posts` |
| API | `app/api/profile/posts/route.ts` | `scope: "PRIVATE"`, `visibleTo: string[]` (recipients excluding self) |
| Storage | `Post` + `PostVisibility` | No `canMessage()`; `userMayPostWithScope` only |
| Delete | `DELETE /api/profile/posts?postId=` | Author or admin |

### 1.3 Dashboard — unread / activity signals

| Signal | Source | Notes |
|--------|--------|-------|
| `dmUnreadByPeerId` | `dmUnreadByPeerFromPrivatePosts()` in `dashboard/page.tsx` | Counts incoming **private posts** since `user.lastLoginAt`; 2-party only |
| `newCommentsCount` | Global comments since last login | Mixed into Private Threads CTA badge |
| Right-rail dots | `dmUnreadByPeerId[peerId]` | Not vault `lastReadAt` |

### 1.4 Msg Vault — read path

| Step | Location | Behavior |
|------|----------|----------|
| List | `GET /api/msg-vault/conversations` | `listConversationsForUser()` |
| Detail | `GET /api/msg-vault/conversations/[id]` | Participants + `buildGovernanceOverlay()` |
| Messages | `GET /api/msg-vault/conversations/[id]/messages` | Paginated, `deletedAt` filtered |
| UI | `MsgVaultShell` + `MsgVaultThreadSelectorRail` + `ConversationPanel` | `conversationId` selection |

### 1.5 Msg Vault — write path

| Step | Location | Behavior |
|------|----------|----------|
| Start direct | `POST /api/msg-vault/conversations` | `createDirectConversation()` — `canMessage()` |
| Start thread | `POST /api/msg-vault/conversations` | `createThreadConversation()` — TU membership, `enablePrivateThreads` |
| Send | `POST .../messages` | `sendMessage()` — `assertCanSendMessage()`, updates `lastMessageAt` |
| Delete message | Service `removeMessage` | Soft `deletedAt` |

### 1.6 Direct-thread key alignment

Both systems use **sorted participant pair**:

- Legacy: `lib/private-thread-keys.ts` → `makeDirectConversationKey`
- Vault: `lib/msg-vault/directKey.ts` → same algorithm

**TU / group keys are not aligned:** legacy uses sorted member ID string; vault uses `trustUnitId` FK for TU threads.

---

## 2. Convergence decision

**Source of truth:** `AihMsgConversation` + `AihMsgParticipant` + `AihMsgMessage`

See `private-thread-source-of-truth.md`.

---

## 3. Legacy bridge plan — recommendation

### Options compared

| Option | Pros | Cons |
|--------|------|------|
| **A — One-time migration only** | Simple mental model; single read path after | Big-bang; hard rollback; migration must be perfect before switch |
| **B — Read-through bridge only** | No migration risk; always current legacy data | Dual read forever; performance; governance split remains on write |
| **C — Hybrid (recommended)** | No lost history; gradual cutover; new messages governed immediately | Temporary dual-read complexity |

### Recommendation: **Option C (hybrid)**

**Phases:**

1. **C1 — Write freeze on legacy (dashboard):** New private messages → vault API only (feature flag).
2. **C2 — Read bridge:** List/detail APIs merge vault conversations + unmigrated legacy threads (read-only legacy messages).
3. **C3 — Backfill migration:** Idempotent job per `legacy-private-post-migration-map.md`.
4. **C4 — Read switch:** Dashboard reads vault only; legacy overlay removed.
5. **C5 — Archive:** Mark legacy PRIVATE posts migrated; block new PRIVATE scope in API.

Option A remains the **terminal state**; C is the path to get there safely.

---

## 4. Migration mapping

Full table: `legacy-private-post-migration-map.md`.

---

## 5. Idempotency

| Layer | Mechanism |
|-------|-----------|
| Direct conversations | `directKey` UNIQUE — upsert by key |
| Thread per TU | Lookup by `trustUnitId` + `kind=THREAD` before create |
| Messages | Proposed `migratedFromPostId` UNIQUE on `AihMsgMessage` |
| Batch runs | Transaction per thread key; log skipped counts |
| Governance audit | `AihMsgGovernanceEvent` with `legacyPostId` in payload |

**Deterministic thread keys:** Recompute `participantKey` / `tuThreadKey` from DB — never trust client state.

**policySnapshot (conversation):**

```json
{
  "sourceType": "migrated",
  "migration": {
    "version": 1,
    "legacyThreadKey": "uuid1,uuid2",
    "postCount": 12,
    "migratedAt": "ISO-8601"
  }
}
```

---

## 6. Governance preservation

| Rule | Legacy today | After convergence |
|------|--------------|-------------------|
| `canMessage()` for 1:1 | Not enforced on post create | Enforced on `createDirectConversation` + send |
| TU membership | Implicit (visibleTo list) | `createThreadConversation` validates TU roster |
| `enablePrivateThreads` | N/A | Honored on thread create |
| Minor messaging | Posting policy partial | `assertCanSendMessage` + minor tier rules |
| External links in body | Post route varies | Blocked for minors unless founder allows |
| UNKNOWN age + links | N/A | Blocked until DOB |
| Child edge-only DM | Possible via visibility hack | Blocked by `canMessage` |
| Explainability | None | `policySnapshot` + overlay on read |

**Migration-specific:** Do not migrate posts where participant set would fail `canMessage` today — quarantine to `LEGACY_UNGOVERNED` report for manual review (or migrate read-only with `LOCKED` status).

**Conservative default:** Migrated conversations `status: ACTIVE`; messages `governanceState: allowed` with snapshot note `preGovernanceLegacy: true`.

---

## 7. Dashboard changes after convergence

| Today | Target |
|-------|--------|
| `getPrivateFeedPosts()` in RSC | Remove from private-tab path |
| `buildPrivateThreads(posts)` | Replace with vault conversation list + map to selector |
| `activePrivateThreadKey` (string) | `activeConversationId` (cuid) |
| `POST /api/profile/posts` PRIVATE | `POST /api/msg-vault/.../messages` |
| `PostCard` for messages | Vault message bubble component (shared styling via `components/vault`) |
| `dmUnreadByPeerId` from posts | Unread from `AihMsgParticipant.lastReadAt` + list API |
| Deep link `/msg-vault?peer=` | Keep; dashboard may redirect or embed same APIs |

**Right rail:** Still family tree for **discovery**; selecting peer calls `createDirectConversation` or selects existing by `directKey`.

---

## 8. Msg Vault changes after convergence

| Capability | Target |
|------------|--------|
| Own all private/direct/group chat | Yes |
| Expose list endpoint used by dashboard | Same `GET /conversations` with optional `?view=dashboard` compact DTO |
| Unread counts | Wire `lastReadAt`; return `unreadCount` per conversation |
| Attachments | Phase 2+ (migrate `imageUrl` or blob refs) |
| Notices | Unchanged — separate layer |

Dashboard is **not a second product** — it is a **compact layout** over vault data.

---

## 9. Data migration agent plan

See `dashboard-msg-vault-convergence-roadmap.md` for sequence.

| Agent | Scope |
|-------|--------|
| **59** | Schema: `migratedFromPostId`, optional `legacyThreadKey` index, migration audit table if needed |
| **60** | `scripts/migrate-private-posts-to-vault.ts` — dry-run, counts, quarantine report |
| **61** | Dashboard read/write switch behind `PRIVATE_THREADS_USE_VAULT` flag |
| **62** | Remove legacy private post code paths; API reject `scope: PRIVATE` |
| **63** | QA + security: `canMessage` bypass audit, idempotency re-run, child accounts |

---

## 10. Risks and open questions

| Risk | Mitigation |
|------|------------|
| Duplicate messages | `migratedFromPostId` unique; merge into existing `directKey` conv |
| Orphan participants | Build participant set from all posts in thread + validate users exist |
| Missing visibility rows | Skip post or treat as author-only broadcast (quarantine) |
| directKey mismatch | Always use `makeDirectConversationKey`; never client keys in migration |
| Deleted posts | Skip deleted; if post deleted after migration, tombstone message optional |
| Unread mismatch | One-time: set `lastReadAt = now` or leave null for "catch up" — document product choice |
| Comments on private posts | v1: not migrated; v2: optional thread messages |
| Image/media posts | Map `imageUrl` into body prefix or defer attachment schema |
| Group threads without TU | Migrate as `THREAD` without `trustUnitId` |
| Founder `enablePrivateThreads: false` | Migration still imports history; new thread create blocked |
| Performance (large histories) | Batch by thread; paginate message insert |
| Dual-write window | Short flag period; monitor divergence |

**Open questions:**

1. Migrate `FAMILY`+visibility legacy posts into vault, or PRIVATE only?  
   **Recommend:** Same participant-key rules (already in `getPrivateFeedPosts`).

2. Should migrated threads appear in both Chats and Threads tabs?  
   **Recommend:** DIRECT → Chats; 3+ → Threads.

3. Hard-delete legacy posts after migration?  
   **Recommend:** No — keep archive 90 days, then optional purge job.

---

## Files created (this pass)

| File |
|------|
| `docs/msg-vault/agent-58-thread-data-convergence-plan.md` (this file) |
| `docs/msg-vault/private-thread-source-of-truth.md` |
| `docs/msg-vault/legacy-private-post-migration-map.md` |
| `docs/msg-vault/dashboard-msg-vault-convergence-roadmap.md` |

## Files inspected (read-only)

**Docs:** `msg-vault-architecture.md`, `communication-layer-map.md`, `schema-contracts.md`, `agent-49-schema-foundation-report.md`, `agent-50-routes-services-report.md`, `agent-57-thread-consistency-qa-report.md`

**Schema:** `prisma/schema.prisma` (`Post`, `PostVisibility`, `AihMsgConversation`, `AihMsgParticipant`, `AihMsgMessage`)

**Dashboard:** `app/(app)/dashboard/page.tsx`, `components/dashboard/private-thread-model.ts`, `DashboardPrivateThreadCenter.tsx`, `DashboardContextRail.tsx`, `PrivateThreadsHub.tsx`, `components/vault/*`

**Msg Vault:** `lib/msg-vault/conversations/index.ts`, `lib/msg-vault/messages/index.ts`, `lib/msg-vault/policy.ts`, `lib/msg-vault/directKey.ts`, `app/api/msg-vault/**`, `components/msg-vault/MsgVaultShell.tsx`

**Legacy API:** `app/api/profile/posts/route.ts`, `lib/posts/queries.ts`

**Governance:** `lib/aihsafe/governance/index.ts` (referenced via `canMessage` in conversation create)

---

## Validation

No build or typecheck required — documentation only. No application source files modified.
