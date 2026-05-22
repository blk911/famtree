# Communication model — Posts, Chats, Messages

Canonical product vocabulary for AMIHUMAN.NET. Code identifiers (e.g. `MsgConversationDTO`) may differ; **user-facing copy** must follow this model.

---

## Surfaces

| Surface | Role |
|---------|------|
| **Dashboard** | Awareness: family **posts**, shortcuts to private **chats** and **notices** |
| **Msg Vault** | Governed **chats**, group **threads**, and **notices** — no broad post feed |
| **Spaces** (Family Safe) | Governed **spaces** with **posts**, announcements, resources, events |
| **Studios** | Published community layer — **posts** / updates for members (not Msg Vault DMs) |

---

## Terms

### Post

A **post** is broad, scoped content for a space or feed:

- Dashboard family feed
- Space / Family Safe activity
- Studio or community updates

Posts are **not** Msg Vault direct messages.

**UI:** “Share a post…”, “Post an update…”, tab **Posts**.

### Chat

A **chat** is a **conversation container** in Msg Vault (usually 1:1 direct).

**UI:** “Chats”, “Open chat”, “Start chat”, “Select a chat to begin.”

### Message

A **message** is one item **inside** a chat (or thread).

**UI:** “Write a message…”, “Send message”, “No messages yet.”

### Thread

A **thread** is a **group or space-linked conversation** in Msg Vault (trust unit, space channel).

Threads are **not** Dashboard feed posts and **not** Studio posts.

**UI:** “Threads” in Msg Vault; avoid “thread” for feed posts on Dashboard (use **Private chats** for the dashboard Msg Vault embed).

### Notice

A **notice** is governance / system / approval traffic:

- Invite approvals
- Policy events
- Member alerts

**UI:** “Notices”, “Select a notice”, “Check notices”.

### Space

A governed **Space** (trust unit, family group, etc.) owns **posts** and member activity — not private Msg Vault DMs.

### Studio

A **published Studio** is the public/member-facing layer for a community. Uses **posts** and announcements; private member chat lives in **Msg Vault**.

### Msg Vault

The **private messaging OS** inside AIH. Owns chats, threads, messages (in those containers), and notices. Does **not** own the main family post feed.

---

## Rules (enforcement)

1. **Msg Vault center** — messages + composer only; no post feed.
2. **Dashboard Posts tab** — posts only; composer says “Share a post…”.
3. **Do not merge** posts into Msg Vault or messages into Dashboard feed.
4. **Chat** = container; **message** = item inside it.
5. Legacy `?tab=overview` on Msg Vault resolves to **Chats**.

---

## Implementation

Shared copy: `lib/product/communication-copy.ts`  
Msg Vault shell: `components/msg-vault/layout/*` (Agent 107)  
Boundary pass: Agent 108 — `docs/msg-vault/agent-108-posts-chats-boundary-report.md`
