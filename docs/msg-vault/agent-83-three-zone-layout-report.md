# Agent 83 — Msg Vault Three-Zone Layout

Branch: `aihsafe-agent-83-msg-vault-three-zone`

## 1. Files modified

| File | Change |
|------|--------|
| `components/msg-vault/MsgVaultShell.tsx` | Single `msg-vault-workspace` grid for all tabs |
| `components/msg-vault/MsgVaultLeftNav.tsx` | **New** — left nav: vertical tabs + selectors |
| `components/msg-vault/NoticeDetailPanel.tsx` | **New** — center notice body |
| `components/msg-vault/rail/MsgVaultContextRail.tsx` | **New** — governance-only right rail |
| `components/msg-vault/MsgContextRail.tsx` | Unchanged behavior; used for chat/thread context |
| `components/vault/EmptyThreadState.tsx` | Shorter copy; `no-chats` variant |
| `components/msg-vault/NoticesPanel.tsx` | Shorter empty copy (legacy; unused in shell) |
| `components/msg-vault/MsgVaultThreadSelectorRail.tsx` | `no-chats` empty variant |
| `app/globals.css` | `.msg-vault-workspace`, left-nav tab styles, responsive stack |

**Deleted (Agent 82 navigation rails):**

- `rail/MsgVaultRail.tsx`
- `rail/MsgVaultChatsRail.tsx`
- `rail/MsgVaultThreadsRail.tsx`
- `rail/MsgVaultNoticesRail.tsx`
- `rail/MsgVaultOverviewRail.tsx`
- `rail/MsgVaultConversationSnippet.tsx`

**Kept:** `rail/MsgVaultRailStatCard.tsx` (overview left-nav shortcuts)

## 2. Three-zone structure

```
| LEFT NAV (220px)     | CENTER (flex)           | RIGHT CONTEXT (232px) |
| Vertical tabs        | Overview / chat /       | Governance only       |
| + tab selectors      | notice detail           | MsgContextRail /      |
|                      |                         | notice meta           |
```

CSS class: `msg-vault-workspace` with `__nav`, `__main`, `__context` children.

## 3. Left navigation behavior

- Vertical section tabs: Overview, Chats, Threads, Notices (badge on Notices).
- **Overview:** stat shortcuts to switch tabs (same counts as center).
- **Chats:** trusted contacts from `allowedContacts=1`, unread dots, New chat.
- **Threads:** private thread rows with unread.
- **Notices:** compact title rows with unread/action indicators.
- Scrollable card shell, active row highlight.

## 4. Center content behavior

- **Overview:** welcome + stat tiles (awareness, not navigation duplicate on right).
- **Chats / Threads:** `ConversationPanel` (feed + composer).
- **Notices:** `NoticeDetailPanel` (title, body, mark-read, link).
- Empty centers: short one-line prompts only.

## 5. Right context rail behavior

`MsgVaultContextRail` + shared `ContextRail mode="vault"`:

- **Overview:** trust spaces + Msg rules / Family Safe / Network links.
- **Chats / Threads:** `MsgContextRail` when selected (participants, overlay, trust unit, relationships); idle state shows Msg rules link only.
- **Notices:** metadata, approval flag, context lines, boundaries — no duplicate people or notice list.

## 6. Removed duplicated selectors/cards

- People list removed from right rail (was `MsgVaultChatsRail`).
- Thread list removed from right rail (was `MsgVaultThreadsRail`).
- Notice list removed from right rail (was `MsgVaultNoticesRail`).
- Horizontal `MsgVaultTabs` bar removed from shell top (tabs live in left nav).
- Separate `msg-vault-overview-grid` / `msg-vault-messaging-grid` / `msg-vault-grid` layouts merged into one workspace.

## 7. Responsive behavior

| Breakpoint | Behavior |
|------------|----------|
| Desktop | 220px \| 1fr \| 232px |
| ≤1024px | Slightly narrower nav/context columns |
| ≤860px | Single column stack: nav → context → main; left nav max-height 280px |

No duplicate selectors on mobile — one nav column only.

## 8. Remaining gaps

- `MsgVaultThreadSelectorRail` and `NoticesPanel` remain in repo for legacy/dashboard reuse but are not mounted in `MsgVaultShell`.
- `MsgVaultTabs.tsx` retained for `MsgVaultTabId` type export only.
- Full `context-rail-model.md` state machine profiles (SPACE, rich DEFAULT) not merged into shared profile components — still in `MsgContextRail`.
- Tablet collapsible left nav drawer not implemented (stack-only).

## 9. Validation results

| Check | Result |
|-------|--------|
| `npm run typecheck` | Pass |
| `npx next build` | Pass |

## Safety

Unchanged: `filterVisibleConversations`, `allowedContacts` API, no public discovery UI, child governed contacts only.
