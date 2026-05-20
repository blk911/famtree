# Agent 84 — Msg Vault Layout Density Repair

Branch: `aihsafe-agent-84-msg-vault-density-repair`

## 1. Files modified

| File | Change |
|------|--------|
| `components/msg-vault/MsgVaultLeftNav.tsx` | Flat nav shell; tab counts; compact rows |
| `components/msg-vault/MsgVaultNavRow.tsx` | **New** — lightweight nav row |
| `components/msg-vault/MsgVaultShell.tsx` | Center via CSS class; flat overview summary rows |
| `components/msg-vault/rail/MsgVaultContextRail.tsx` | Removed global CTAs; contextual-only |
| `components/vault/EmptyThreadState.tsx` | Shorter copy |
| `components/msg-vault/NoticeDetailPanel.tsx` | Shorter empty copy |
| `app/globals.css` | Center-dominant grid, nav/context density tokens |

**Deleted:** `rail/MsgVaultRailStatCard.tsx`

## 2. Left rail flattening

- Removed bordered stat cards (`MsgVaultRailStatCard`).
- Left panel: flat `#fafaf9` shell, no card shadow.
- Section tabs show inline counts: `Chats (2)`, `Threads (1)`, `Notices (3)`.
- Overview shortcuts use `MsgVaultNavRow` (label + count, no “Open →”).
- Chats/threads: tighter `ThreadSelectorRow` padding; `+ New chat` text action; inline empty lines instead of dashed empty-state boxes in nav.
- Notices nav: compact rows with unread dot class.

## 3. Center dominance adjustments

- Grid: `172px | 2.4fr | 188px` (center gets ~2.4× weight vs sides).
- Center column: stronger shadow (`0 2px 14px`), full-height white panel via `.msg-vault-workspace__main`.
- Side rails: lighter framing, reduced gap (10px).

## 4. Right rail cleanup

Removed redundant in-vault links:

- Msg rules
- My Network
- Open Family Safe / approvals (global)
- Boundaries block with policy essay

**Kept:**

- `MsgContextRail` for active chat/thread (participants, overlay, trust unit, relationships).
- Overview: trust spaces list only (or one-line idle hint).
- Notices: governance metadata + contextual `Open approval →` when `notice.href` exists.

## 5. Overview cleanup

- Center: welcome line + flat summary rows (`Direct chats 0`) — no large stat tiles.
- Left overview: three compact `MsgVaultNavRow` items (replaces stat cards).
- Right overview: trust spaces only — no governance CTA stack.

## 6. Empty state changes

| Location | Copy |
|----------|------|
| Center conversation | Select a conversation. |
| Left chats | No trusted conversations yet. |
| Left threads | No private threads yet. |
| Left notices | No notices. |
| Right idle | Select a conversation. / Select a thread. |

## 7. Responsive behavior

- ≤1024px: slightly narrower side columns, center still `2fr`.
- ≤860px: stack nav → context → **main last** so center remains primary on scroll.
- Left nav max-height 240px on mobile (compact strip, no duplicate selectors).

## 8. Remaining visual gaps

- `MsgContextRail` sections still use vault `ContextRailSection` card chrome (flattened via CSS override only in vault workspace context column).
- `MsgVaultThreadSelectorRail` / `NoticesPanel` unused in shell but unchanged for legacy routes.
- No collapsible left drawer on tablet (stack-only).

## 9. Validation results

| Check | Result |
|-------|--------|
| `npm run typecheck` | Pass |
| `npx next build` | Pass |

## Safety

No API, schema, or governance logic changes. Visibility rules unchanged.
