# Msg Vault — MVP Build Plan

**Agent:** 48  
**Branch:** `aihsafe-agent-48-msg-vault-architecture`

Recommended implementation sequence after this architecture pass. Each item is a **separate agent** with a focused branch. Do not parallelize schema-dependent work.

---

## Phase 0 — This pass (complete)

| Deliverable | Status |
|---|---|
| `docs/msg-vault/*.md` architecture set | ✅ Agent 48 |
| No product code / schema / UI | ✅ |

---

## Agent 49 — Schema foundation

**Branch:** `aihsafe-agent-49-msg-vault-schema`

**Scope:**

- Additive Prisma models: `MsgVaultConversation`, `MsgVaultParticipant`, `MsgVaultMessage`, `MsgVaultNotice` (names TBD; align with architecture doc objects).  
- Optional: `messagingPolicy` JSON on `AihPolicyProfile`.  
- Indexes: `(conversationId, createdAt)`, `(userId, lastReadAt)`.  
- `db:push` + `db:generate` only.

**Must NOT:** Wire routes or UI.

**Validation:** `tsc`, build pass.

---

## Agent 50 — Route foundation

**Branch:** `aihsafe-agent-50-msg-vault-routes`

**Prerequisite:** Agent 49

**Scope:**

- `app/(app)/msg-vault/layout.tsx` — shell with internal tab nav (no AppShell expansion).  
- Segments: `overview`, `chats`, `threads`, `notices`, `people`, `spaces`, `settings`.  
- `middleware.ts` — protect `/msg-vault`.  
- Stub pages (server components) with role-aware tab visibility.

**Must NOT:** Full chat UI; rename `/aihsafe` metadata to Family Safe.

**Validation:** Routes resolve; unauthorized → redirect.

---

## Agent 51 — UI shell

**Branch:** `aihsafe-agent-51-msg-vault-shell`

**Prerequisite:** Agent 50

**Scope:**

- `components/msg-vault/MsgVaultShell.tsx` — two-column layout (main + context rail placeholder).  
- Internal `MsgVaultTabs` mirroring role matrix from architecture doc.  
- Update `DashboardVaultTabs` link: `/aihsafe` → `/msg-vault`.  
- Rename `app/(app)/aihsafe/page.tsx` metadata to **Family Safe**.

**Must NOT:** Message composer logic.

---

## Agent 52 — Direct chat MVP

**Branch:** `aihsafe-agent-52-direct-chat-mvp`

**Prerequisite:** Agents 49–51

**Scope:**

- `POST/GET /api/msg-vault/conversations` (direct type only).  
- `POST /api/msg-vault/conversations/[id]/messages`  
- Enforce `buildActorContext` + `canMessage` on create.  
- Read-through adapter: optional display of legacy `Post` PRIVATE thread for history.  
- Chats tab UI: list + single thread + composer (text only).

**Must NOT:** Group threads, attachments, reactions.

---

## Agent 53 — Notices MVP

**Branch:** `aihsafe-agent-53-notices-mvp`

**Prerequisite:** Agent 50 (can parallel with 52 after 50)

**Scope:**

- Aggregate `AihApprovalRequest`, pending `Invite`, trust gate requests into Notices tab.  
- Unified card component + deep links to Family Safe approvals.  
- Extend `getVaultNotificationCount` with unread message + notice breakdown.

**Must NOT:** New approval executor logic (reuse existing).

---

## Agent 54 — Context rail MVP

**Branch:** `aihsafe-agent-54-context-rail-mvp`

**Prerequisite:** Agent 52

**Scope:**

- `components/msg-vault/MsgVaultContextRail.tsx`  
- Profiles: DEFAULT, DIRECT_CHAT (parent/child), THREAD (TU).  
- `GovernanceOverlay` block on every profile.  
- Wire dashboard deep link `?peer=` to open rail + chat.

---

## Agent 55 — Threads MVP (group / TU)

**Branch:** `aihsafe-agent-55-threads-mvp`

**Prerequisite:** Agent 52

**Scope:**

- Group + trust_unit conversation types.  
- Enforce `enablePrivateThreads` on create.  
- Migrate primary UX off dashboard `PrivateFeedClient` tab (keep link/deep link).  
- Minor: approved-threads-only list.

---

## Agent 56 — QA / security pass

**Branch:** `aihsafe-agent-56-msg-vault-qa`

**Prerequisite:** Agents 52–55

**Scope:**

- Matrix test: tiers × relationship × founder flags.  
- Attempt stranger DM → 403.  
- Minor edge-only → deny.  
- UNKNOWN DOB messaging policy.  
- Document results in `docs/msg-vault/qa-report.md`.

---

## Dependency graph

```
48 (docs)
 └── 49 (schema)
      ├── 50 (routes)
      │    └── 51 (shell)
      │         ├── 52 (direct chat)
      │         │    ├── 54 (context rail)
      │         │    └── 55 (threads)
      │         └── 53 (notices)
      └── 56 (QA) ← after 52–55
```

Agents 53 and 51 can overlap lightly; 52 blocks 54 and 55.

---

## Explicit non-goals (do not build until post-MVP)

| Feature | Reason deferred |
|---|---|
| Reactions / emoji | Social engagement creep |
| Stories / reels | Out of product scope |
| Public search / hashtags | Violates no-discovery thesis |
| Full attachments / media gallery | Storage, moderation, AV scan |
| External sharing / export | Policy + compliance |
| Voice / video calls | Separate product surface |
| Bot / webhook integrations | Enterprise chat pattern |
| E2E encryption | Major key management project |
| Message editing / unsend | Complexity + audit |
| @mentions / channels | Slack pattern |
| Algorithmic “recommended” threads | Feed anti-pattern |
| Real-time WebSocket (optional later) | Polling acceptable for MVP |
| Email notifications for every message | Notice batching first |

---

## Family Safe alignment tasks (parallel track)

| Task | Owner |
|---|---|
| Enforce `enablePrivateThreads` on TU create | Agent 55 or policy agent |
| `MessagingPolicy` type + resolvePolicyProfile | Agent 49 |
| URL scan for minors (`allowMinorExternalLinks`) | Shared with activity route |
| Rename UX: Family Safe vs Msg Vault | Agent 51 |

---

## Success criteria (MVP)

1. Member opens `/msg-vault`, sees role-appropriate tabs.  
2. Member starts direct chat only with governed contact; stranger blocked at API.  
3. Guardian sees pending child actions in Notices + context rail.  
4. Dashboard “Msg Vault” link lands in msg-vault, not governance shell.  
5. `getVaultNotificationCount` reflects real unread + approvals.  
6. No new public discovery surfaces shipped.

---

## Rollout strategy

1. **Soft launch:** Feature flag or founder-only `/msg-vault` access.  
2. **Dual-run:** Dashboard Private Threads tab remains 2 weeks with banner “Try new Msg Vault”.  
3. **Cutover:** Private Threads tab becomes deep link only.  
4. **Legacy:** Stop creating new PRIVATE `Post` DMs; archive read-only.
