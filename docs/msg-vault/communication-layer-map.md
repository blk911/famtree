# Msg Vault — Communication Layer Map

**Agent:** 48  
**Branch:** `aihsafe-agent-48-msg-vault-architecture`

This document defines **what each communication layer is for**, how layers differ, and how today’s `Post`-based implementation maps to the target Msg Vault model.

---

## Layer overview

| Layer | Audience | Persistence (target) | Persistence (today) | Mutable by user? |
|---|---|---|---|---|
| **Posts** | Family / network / space broadcast | `Post` + `scope` + optional `spaceId` | Same | Yes (author); minors may escalate |
| **Private Threads** | Defined participant set or trust unit | `Conversation` (type=`group` \| `trust_unit`) | `Post` `PRIVATE` + `PostVisibility` | Yes (members); join gated |
| **Direct Chats** | Exactly two parties with relationship edge | `Conversation` (type=`direct`) | `Post` `PRIVATE` with 2-party visibility | Yes |
| **Notices** | Individual or role (approver, guardian) | `Notice` | `AihApprovalRequest`, `Invite`, audit events (fragmented) | System-generated; user acts (approve/deny) |
| **Vault Records** | Auditors, guardians, founders | `VaultRecord` / `AihAuditEvent` | `AihAuditEvent`, resolved approvals | Append-only |

---

## 1. Posts — family / network broadcast

### Purpose

Share updates with everyone allowed by **dashboard feed scope** — not for rapid back-and-forth coordination.

### Characteristics

- Default home: **Dashboard → Posts** (`DashboardPostsPanel`, `variant="feed"`).
- Scopes: `FAMILY`, `BUSINESS`, `CLUB`, `CHURCH`, `PRIVATE` (dashboard enum) — distinct from AIH Safe `VisibilityScope` on activity posts.
- Visibility enforced by `dashboardFeedWhere(viewerId)` and `Post.scope` / `PostVisibility`.
- Comments/likes are **engagement on a broadcast**, not a chat transcript.

### Governance touchpoints

- Minor posting: `resolvePolicyProfile` + `canPostContent` on AIH activity route; dashboard posts use separate API (family vault routes).
- Escalation pattern for minors on AIH activity applies to **Family Safe Activity**, not necessarily dashboard posts yet — Msg Vault plan should **align** both under one posting policy over time.

### Stays out of Msg Vault

Posts remain on the dashboard (and `/family-vault/posts`) as the **public-to-family** layer. Msg Vault may **link** to a post (“Discuss in thread”) but does not replace the feed.

---

## 2. Private Threads — governed group conversations

### Purpose

Sustained multi-party dialogue inside a **closed participant set**: trust unit members, family unit, or explicit invite list.

### Characteristics

- Today: `getPrivateFeedPosts()` merges PRIVATE-scoped posts + legacy FAMILY posts with visibility rows.
- `PrivateFeedClient` builds `Thread` objects (`type: "tu" | "direct" | "group"`) from posts — **presentation layer only**.
- Trust-unit threads keyed by sorted member IDs; group threads from visibility participant sets.

### Target

- `Conversation.type = trust_unit | group | space`
- Participants in `ConversationParticipant`
- Messages append to `Message` table (ordered, paginated)
- Thread list sorted by `lastMessageAt`

### Founder setting

`AihFounderSettings.enablePrivateThreads` — when `false`, **block new thread creation** (existing threads may be read-only or grandfathered — product decision for MVP).

### Distinction from Direct Chats

| | Private Thread | Direct Chat |
|---|---|---|
| Parties | 3+ or trust-unit default | Exactly 2 |
| Discovery | From spaces / TU membership | From People rail / relationship list |
| UI tab | **Threads** | **Chats** |
| Minor UX | Approved threads only | Guardian / TU / edge only |

---

## 3. Direct Chats — relationship-specific quick communication

### Purpose

Low-friction 1:1 coordination between people who **already have a governed relationship**.

### Gate (kernel — already implemented)

`canMessage(actor, target)` requires at least one of:

- Shared `TrustUnit` membership  
- Guardian ↔ child relationship (either direction)  
- Active `relationshipEdge`  
- Minor additional rule: minors only if guardian link or shared unit (not edge-only)

### Target

- One `Conversation` per canonical pair (`participantA`, `participantB` sorted).
- Reuse `directThreadKey()` logic from `lib/private-thread-keys.ts` for stable IDs during migration.

### Dashboard interim

`DashboardContextRail` → `onMemberPrivateThreadClick` → switches dashboard tab to Private Threads and sets `launchDmPeerId` — this becomes **deep link** to `/msg-vault/chats?peer=`.

---

## 4. Notices — approvals, invites, policy & status events

### Purpose

**Actionable system events** that are not free-form messages. Users complete tasks here (approve post, accept invite, read policy change).

### Notice types (initial catalog)

| kind | Trigger | Primary actor |
|---|---|---|
| `approval.pending` | `AihApprovalRequest` created | Approver |
| `approval.resolved` | approved / denied / expired | Requestor + approver |
| `invite.pending` | Family / trust invite | Sender / recipient |
| `invite.accepted` | Invite REGISTERED | Sender |
| `policy.updated` | Founder settings PATCH | All members (read) |
| `membership.joined` | TU / space member add | Space members |
| `membership.left` | exit / revoke | Space members |
| `message.blocked` | governance deny on send | Sender |
| `child.escalation` | minor action queued | Child + guardian |

### vs Chat

- Notices do not use @mentions, reactions, or edit history.
- Notices may **embed** a deep link to a Thread or Chat (“View conversation”).
- Notices age out or archive to **Vault Records** when resolved.

### Today

Fragmented across:

- `GuardianInbox` / `ChildEscalationStatus` (approvals)  
- Dashboard Invites tab  
- `getVaultNotificationCount` ingredients  

Msg Vault **Notices** tab unifies presentation; APIs aggregate existing tables first, native `Notice` table later.

---

## 5. Vault Records — archived trust / governance artifacts

### Purpose

Long-lived, **read-mostly** artifacts for accountability: audit events, resolved approvals, exported conversation summaries (future).

### Characteristics

- Append-only from user perspective.
- Visible to founders, guardians (for their minors), and participants where appropriate.
- Not mixed into Chats/Threads list — accessed from Overview → “Record history” or Space settings.

### Today

- `AihAuditEvent` in schema  
- Approval rows after resolution  

### Target

Optional `VaultRecord` envelope linking audit + conversation snapshot for compliance scenarios (business org mode).

---

## Cross-layer rules

1. **No upward leakage** — a Direct Chat cannot “promote” to public Post without explicit compose + scope check.  
2. **No downward bypass** — cannot DM someone to evade a blocked Thread membership.  
3. **Single governance path** — all layers call the same context + policy + kernel stack.  
4. **Explainability required** — every layer exposes a `GovernanceOverlay` reason string in UI.

---

## Migration map (Post → Conversation)

| Current | Target |
|---|---|
| `Post` + `scope: PRIVATE` + visibility | `Conversation` + `Message` rows |
| `PrivateFeedClient` thread key | `Conversation.externalKey` |
| Comment thread on post | Either stay on Posts only, or `Message` replies in MVP phase 2 |
| `dmUnreadByPeerFromPrivatePosts` on dashboard | `ConversationParticipant.lastReadAt` |

**Phase 0 (MVP):** Dual-write or read-through adapter — new messages write to `Message`, legacy read still scans `Post` for history.

---

## Layer ↔ route map (target)

| Layer | Route segment |
|---|---|
| Posts | `/dashboard`, `/family-vault/posts` |
| Threads | `/msg-vault/threads` |
| Chats | `/msg-vault/chats` |
| Notices | `/msg-vault/notices` |
| Vault Records | `/msg-vault/records` (or nested under Settings) |
| Family Safe (policy) | `/aihsafe` |

---

## ASCII: message flow (target)

```
User composes in Chats
        │
        ▼
buildActorContext + resolvePolicyProfile
        │
        ▼
canMessage / canSendInConversation
        │
   ┌────┴────┐
 allow    escalate / deny
   │         │
   ▼         ▼
Message   Notice (approval.pending)
 row          │
               ▼ (guardian approves)
            Message row via executeDeferredAction
```
