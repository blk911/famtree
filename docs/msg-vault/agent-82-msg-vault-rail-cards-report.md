# Agent 82 — Msg Vault Context Rail Cards

Branch: `aihsafe-agent-82-msg-vault-rail-cards`

## 1. Files modified

| File | Change |
|------|--------|
| `components/msg-vault/rail/MsgVaultRail.tsx` | Tab router over shared `ContextRail` |
| `components/msg-vault/rail/MsgVaultOverviewRail.tsx` | Overview stat cards + trust spaces + Family Safe / Msg rules |
| `components/msg-vault/rail/MsgVaultRailStatCard.tsx` | Count + Open CTA |
| `components/msg-vault/rail/MsgVaultChatsRail.tsx` | Trusted contacts, unread, New chat, selected snippet |
| `components/msg-vault/rail/MsgVaultThreadsRail.tsx` | Private threads, trust spaces, selected snippet |
| `components/msg-vault/rail/MsgVaultNoticesRail.tsx` | Notice list, approvals, mark-read, selected context |
| `components/msg-vault/rail/MsgVaultConversationSnippet.tsx` | Compact selected conversation + access + Family Safe link |
| `components/msg-vault/MsgVaultShell.tsx` | Layout grids; wires `MsgVaultRail`; loads allowed contacts |
| `components/msg-vault/MsgVaultThreadSelectorRail.tsx` | Unread dots; neutral empty states |
| `components/msg-vault/MsgContextRail.tsx` | Removed default/policy instructional rails |
| `components/vault/EmptyThreadState.tsx` | Neutral `pick` copy |
| `app/(app)/msg-vault/page.tsx` | Dropped unused `lastName` prop |
| `app/globals.css` | `msg-vault-overview-grid`, `msg-vault-messaging-grid`; notices rail 232px |

## 2. Rail cards added

- **Overview:** `MsgVaultRailStatCard` (Direct chats, Private threads, Notices), Trust spaces list, Family Safe quick actions (Msg rules, governance tab, My Network).
- **Chats:** People section with avatars, chat icons, unread dots, New chat; optional Selected + Access + Family Safe snippet when a direct chat is open.
- **Threads:** Private threads list with unread; Trust spaces; selected thread snippet.
- **Notices:** Scrollable notice rows with unread dots; Needs review count; Selected notice body + Mark as read + related link; Family Safe approvals link (non-child).

## 3. Overview rail behavior

Overview uses `msg-vault-overview-grid` (main welcome stats + 232px rail). Rail mirrors main stat counts and **Open →** switches to Chats, Threads, or Notices. Trust spaces show active units (Agent 79 filter). Family Safe section links to `/aihsafe` and `/tree` without long policy copy.

## 4. Chats rail behavior

Messaging layout is three columns: conversation list (220px) | panel | rail (232px). Left list shows existing direct chats with unread. Right rail loads `GET ?allowedContacts=1` only on the Chats tab; tapping a person opens or starts a governed direct chat. Empty contacts: “No trusted contacts yet.” Selected direct chat shows a short snippet (title, participants, visibility reason if any).

## 5. Threads rail behavior

Same 3-column layout with thread filter on the left. Right rail lists private/trust-unit threads with unread and highlights selection. Trust spaces section when active units exist. Empty: “No private threads yet.” Selected non-direct thread shows compact snippet including space name when available.

## 6. Notices rail behavior

`msg-vault-grid` list + 232px rail. Rail lists notices (unread dot, action flag), approval summary, and selected-notice context with **Mark as read** via existing `markVaultNoticeRead`. No duplicate long notice essay from legacy `MsgContextRail`.

## 7. Removed instructional cards

- `MsgContextRail` `DefaultContextRail` (“Select a conversation…”, “never offers open DMs…”).
- `FamilySafeHint` policy blocks on conversation/notice rails.
- `EmptyThreadState` `pick`: was “Select someone from the right…” → “Choose a chat from the list.”
- `MsgVaultThreadSelectorRail` no longer uses `pick` empty state in the list column.
- Shell no longer stacks `MsgVaultThreadSelectorRail` + `MsgContextRail` in the right rail.

## 8. Validation results

| Check | Result |
|-------|--------|
| `npm run typecheck` | Pass |
| `npx next build` | Pass (retry after clean `.next`; first run hit transient `PageNotFoundError` on unrelated admin route) |

## Safety

- Contacts: server `allowedContacts` only; no stranger search UI.
- Conversations/threads: `filterVisibleConversations` + trust-unit guard (Agent 80).
- Trust spaces: `getActiveTrustUnits` hides self-only units (Agent 79).
- Child shells: short guardian hint on overview only; approvals link hidden on notices rail for `child` mode.
