# Agent 107 — Msg Vault IG-style communication shell

**Branch:** `msgvault-agent-107-ig-shell`  
**Mission:** Refactor Msg Vault from dashboard-card layout into a tight IG / iMessage communication shell.

---

## Files modified

| File | Change |
|------|--------|
| `components/msg-vault/layout/CommunicationShell.tsx` | **New** — 3-zone shell composer |
| `components/msg-vault/layout/CommunicationStatusBar.tsx` | **New** — compact pills under hero |
| `components/msg-vault/layout/ConversationListPanel.tsx` | **New** — left conversation list |
| `components/msg-vault/layout/ConversationListRow.tsx` | **New** — avatar + title + activity row |
| `components/ui/msg-vault.tsx` | Rewritten — `Communication*` primitives; legacy grid aliases |
| `components/msg-vault/MsgVaultShell.tsx` | Uses shell; removed overview dashboard |
| `components/msg-vault/MsgVaultTabs.tsx` | `chats \| threads \| notices` only; `normalizeMsgVaultTab()` |
| `components/msg-vault/ConversationPanel.tsx` | Dense thread header, bubbles, composer, attach hint |
| `components/msg-vault/rail/MsgVaultContextRail.tsx` | People / trust focus; no overview analytics |
| `components/msg-vault/NoticeDetailPanel.tsx` | Tighter empty/loading states |
| `components/vault/EmptyThreadState.tsx` | Updated copy |

## Removed

| File | Reason |
|------|--------|
| `components/msg-vault/MsgVaultLeftNav.tsx` | Replaced by `ConversationListPanel` |
| `components/msg-vault/MsgVaultNavRow.tsx` | Inlined via list row + UI primitives |

---

## Shell structure

```text
[ Status pills: Chats N | Threads N | Notices N ]   ← under AppPageHero

┌─────────────────┬──────────────────────────┬─────────────────┐
│ Conversation    │ Active chat / notice     │ People / trust  │
│ list (240–280)  │ Messages + composer      │ context (~200)  │
└─────────────────┴──────────────────────────┴─────────────────┘
```

- **LEFT:** Scrollable list filtered by active pill; compact rows (avatar, name, last activity, unread).
- **CENTER:** Primary focus — message thread or notice body; empty: “Select a chat to begin.”
- **RIGHT:** Relationship rail (`MsgContextRail` when active; idle people + trust spaces + Family Safe link).

### Responsive (≤860px)

Stack order: list → context → main (matches mobile messenger flow).

---

## Terminology

| UI label | Meaning |
|----------|---------|
| **Chats** | Direct 1:1 conversations |
| **Threads** | Group / trust-unit threads |
| **Notices** | Governance / system events |
| **Messages** | Items inside a chat (composer sends messages) |
| **Posts** | Reserved for broader space updates (not used in this shell) |

Removed **Overview** tab and welcome/stat card dashboard.

---

## Validation

| Command | Result |
|---------|--------|
| `npm run typecheck` | Pass |
| `npx next build` | Blocked locally by Prisma `EPERM` (dev server lock on query engine); safe to run on CI/Vercel |

---

## Manual QA

1. `/msg-vault` — pills visible; default **Chats**; left list shows conversations.
2. Select row — center loads messages + composer; right shows people/context.
3. **Threads** / **Notices** pills — list filters; center updates.
4. Narrow viewport — stacked list → context → thread.
5. `?tab=overview` — still opens **Chats** (legacy URL).
