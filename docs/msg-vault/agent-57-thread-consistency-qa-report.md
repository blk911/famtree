# Agent 57 — Msg Vault / Dashboard Thread Consistency QA

**Branch:** `aihsafe-agent-57-thread-consistency-qa`

## Files modified

| File | Change |
|------|--------|
| `components/vault/MemberAvatar.tsx` | **New** — shared avatar chip |
| `components/vault/ThreadStatusDot.tsx` | **New** — unread badge / placeholder dot |
| `components/vault/ThreadSelectorRow.tsx` | **New** — right-rail row (name, chat icon, selection) |
| `components/vault/ThreadSelectorList.tsx` | **New** — selector list container |
| `components/vault/EmptyThreadState.tsx` | **New** — warm empty states (`pick`, `no-messages`) |
| `components/vault/ThreadComposer.tsx` | **New** — shared compose shell (textarea + send) |
| `components/dashboard/PrivateThreadsHub.tsx` | **New** — reusable center + right-rail grid |
| `components/dashboard/DashboardContextRail.tsx` | Uses shared `ThreadSelectorRow` / `ThreadSelectorList` |
| `components/dashboard/DashboardPrivateThreadCenter.tsx` | `EmptyThreadState`, `ThreadComposer`; removed clutter hints |
| `components/dashboard/DashboardHubColumns.tsx` | `thread-hub-grid` layout class |
| `components/PrivateFeedClient.tsx` | Replaced accordion UI with `PrivateThreadsHub` wrapper |
| `components/msg-vault/MsgVaultThreadSelectorRail.tsx` | **New** — vault right-rail selector |
| `components/msg-vault/MsgVaultShell.tsx` | Center = conversation only; selector on right; no auto-pick first thread |
| `components/msg-vault/ConversationPanel.tsx` | Shared empty states |
| `components/msg-vault/MessageComposer.tsx` | Uses `ThreadComposer` styling |
| `components/msg-vault/ConversationList.tsx` | Deprecated re-export |
| `app/globals.css` | `thread-hub-grid`, `thread-selector-*`, `thread-composer-*`, `thread-empty-state` |
| `app/(app)/family-vault/private/page.tsx` | Unchanged route; renders via updated `PrivateFeedClient` |
| `docs/msg-vault/agent-57-thread-consistency-qa-report.md` | This report |

## 1. Old accordion UI removed

- `PrivateFeedClient.tsx` no longer renders “New private message”, thread accordions, or stacked participant headers — delegates to `PrivateThreadsHub` (same model as Dashboard Private Threads).
- Msg Vault **left-column** conversation list removed; no duplicate list beside the active panel.
- Removed instructional banners / dual-store hints from dashboard center header (Agent 57 spec: remove clutter).

## 2. Shared components added

- `ThreadSelectorRow`, `ThreadSelectorList`, `EmptyThreadState`, `ThreadComposer`, `MemberAvatar`, `ThreadStatusDot` under `components/vault/`.

## 3. Dashboard / Msg Vault alignment

| Aspect | Dashboard | Msg Vault |
|--------|-----------|-----------|
| Layout | `thread-hub-grid`: center + 232px right rail | Same (`thread-hub-grid--vault`) |
| Center | `DashboardPrivateThreadCenter` — one thread | `ConversationPanel` — one conversation |
| Right rail | Family tree, bond peers, trust units | People / trust threads list + governance card |
| Empty (none selected) | “Select someone from the right…” | Same copy via `EmptyThreadState` |
| Empty (no messages) | “No private messages yet.” | Same |
| Auto-select first thread | No | No (removed auto-open first conversation) |

## 4. Right rail behavior

- **Highlight:** `thread-selector-row--active` when thread/conversation selected.
- **Chat icon + dot:** On dashboard family/TU member rows; on vault conversation rows.
- **Trust unit:** TU header button opens TU post-thread key on dashboard; vault threads tab lists non-direct conversations.
- **Start chat:** Vault “New” on People section (chats tab only).

## 5. Remaining inconsistencies

1. **Data stores** — Dashboard still uses `Post` PRIVATE; Msg Vault uses `AihMsgConversation` / messages (not unified).
2. **Unread on vault rail** — Placeholder dot only (`unread={0}`); no vault unread API wired to selector.
3. **Dashboard CTA counts** — Still post/comment based, not vault message unread.
4. **Chats vs Threads tabs** — Msg Vault keeps two tabs; dashboard uses one Private Threads tab (same layout within each tab).
5. **Notices tab** — Unchanged list + rail (not part of private-thread selector model).

## 6. Validation

- `npm run typecheck` — pass
- `npm run build` — pass

## Manual QA checklist

- [ ] Dashboard → Private Threads: empty center until right-rail pick; one thread open at a time.
- [ ] Family member row opens direct thread; TU header opens TU thread.
- [ ] `/family-vault/private` — no accordions; same selector + center layout.
- [ ] `/msg-vault` → Chats/Threads: center empty until right-rail selection; no left list column.
- [ ] Switch Chats ↔ Threads: selection clears until user picks again (expected).
- [ ] Compose + send on both surfaces.
