# Agent 57 — Msg Vault / Dashboard Thread Consistency QA

**Branch:** `aihsafe-agent-57-msg-vault-dashboard-thread-qa`  
**Date:** 2026-05-19

## Executive summary

The product currently runs **two parallel communication stores** for “private” family messaging:

| Surface | UI location | Data store | Message shape |
|---------|-------------|------------|---------------|
| **Dashboard Private Threads** | `/dashboard` → Private Threads tab | `Post` (`scope: PRIVATE`) + `PostVisibility` | Post cards + comments |
| **Msg Vault** | `/msg-vault` → Chats / Threads | `AihMsgConversation` + `AihMsgMessage` | Native chat transcript |

They are **not synchronized**. Sending on the dashboard does not appear in Msg Vault and vice versa. This QA pass documents gaps, aligns **direct-key** semantics, and adds **cross-navigation** for 1:1 threads.

---

## QA matrix

| Check | Dashboard | Msg Vault | Consistent? |
|-------|-----------|-----------|-------------|
| Direct 1:1 identity key | `directThreadKey()` → `makeDirectConversationKey()` | `AihMsgConversation.directKey` | **Yes** (after Agent 57) |
| Trust-unit group key | Sorted member IDs (`tuThreadKey`) | `trustUnitId` on conversation row | **No** — different models |
| Contact eligibility | Tree + `bondPeers` + TU members in right rail | `listAllowedChatContacts()` + `canMessage()` | **Partial** — similar intent, different lists |
| Unread signal | `dmUnreadByPeerFromPrivatePosts` (new private *posts* since `lastLoginAt`) | `AihMsgParticipant.lastReadAt` (not wired to dashboard badge) | **No** |
| Activity CTA “Private Threads” count | `max(newCommentsCount, sum(dmUnread))` | N/A | **No** — mixes comment activity with DM posts |
| Activity CTA “Msg Vault” count | `getVaultNotificationCount()` (trust/approvals only) | In-shell `unreadNotices` | **No** — badge ignores vault messages/notices |
| Governed send gate | None on `/api/profile/posts` PRIVATE | `canMessage` + policy on vault APIs | **No** |
| Deep link peer → open chat | N/A | `?tab=chats&peer={userId}` | **Added** Agent 57 |
| Link dashboard → vault | Hint + link on direct thread header | Auto-select or create direct conv | **Added** Agent 57 |
| `/family-vault/private` | Legacy `PrivateFeedClient` accordion | Not linked | **No** — still old UX |
| Msg Vault href from dashboard | `/msg-vault` (CTA, context rail, vault tab) | — | **Yes** |

---

## Findings (by severity)

### P0 — Dual stores (documented, not fixed)

Users can believe they are continuing “the same” conversation when switching between Dashboard Private Threads and Msg Vault Chats. Content is stored in different tables with no migration bridge.

**Recommendation (future):** Single write path for 1:1 (vault messages) with dashboard read-only preview, or sync job Post ↔ Message.

### P1 — Unread / badge semantics

- Dashboard right-rail dots use **private post** counts, not Msg Vault unread.
- `getVaultNotificationCount` hard-codes `unreadVaultMessages = 0` and does not include notice unread from `/api/msg-vault/notices`.

### P2 — Governance asymmetry

Msg Vault direct chats enforce `canMessage()`. Dashboard private posts use profile post API without the same kernel check on every send (bond/TU visibility implied by who can be selected in UI only).

### P3 — Trust-unit threads

- Dashboard TU threads = all TU member IDs sorted, matched to PRIVATE posts.
- Msg Vault TU threads = `createThreadConversation({ trustUnitId, participantUserIds })` — separate conversation records, optional subset of members.

### P4 — Legacy routes

`/family-vault/private` still renders full `PrivateFeedClient` accordion; inconsistent with Agent 56 dashboard center layout.

---

## Fixes applied (Agent 57)

| File | Change |
|------|--------|
| `lib/private-thread-keys.ts` | `directThreadKey` delegates to `makeDirectConversationKey` |
| `lib/msg-vault/directKey.ts` | `findDirectConversationByPeer()` helper |
| `components/msg-vault/MsgVaultShell.tsx` | Deep link: `?tab=chats&peer={userId}` selects or creates governed direct chat |
| `app/(app)/msg-vault/page.tsx` | `Suspense` boundary for `useSearchParams` |
| `components/dashboard/DashboardPrivateThreadCenter.tsx` | Hint + link to Msg Vault for direct threads; TU copy clarifies split |
| `app/globals.css` | Hint / link styles |

---

## Manual test plan

1. **Direct key alignment**  
   - Pick users A, B. Verify `directThreadKey(A,B) === makeDirectConversationKey(A,B)`.

2. **Dashboard → Vault**  
   - Open dashboard Private Threads, select a family member with a direct thread.  
   - Click **Msg Vault** in the hint.  
   - Expect `/msg-vault?tab=chats&peer=…` to open Chats with that person (existing conv selected, or new governed chat created).

3. **Vault isolation**  
   - Send a message in Msg Vault. Confirm it does **not** appear in dashboard private thread posts (expected until unified store).

4. **Dashboard isolation**  
   - Send a private post from dashboard. Confirm it does **not** appear in Msg Vault messages (expected).

5. **Unread dots**  
   - Have another user send a vault message only → dashboard rail dot should **not** increment (post-based unread only).

6. **CTA strip**  
   - Msg Vault card still uses governance notification count, not chat unread.

---

## Validation

- `npm run typecheck` — pass  
- `npm run build` — pass  

---

## Remaining gaps (out of scope)

1. Unify data stores or add sync layer.  
2. Wire `getVaultNotificationCount` to vault notices + message unread.  
3. Align dashboard private send with `canMessage`.  
4. Migrate `/family-vault/private` to dashboard-style selector or redirect.  
5. Right-rail link for TU threads → `?tab=threads&trustUnitId=…` (needs vault deep-link support).  
6. Group (non-TU) private post threads in dashboard with no rail entry.
