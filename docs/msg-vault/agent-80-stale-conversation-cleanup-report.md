# Agent 80 — Stale Msg Vault conversation cleanup / display guard

**Branch:** `aihsafe-agent-80-stale-conversation-cleanup`  
**Date:** 2026-05-19

## Problem

Test-remnant Msg Vault conversations appeared in the Dashboard right rail and Msg Vault selector: empty direct chats, solo-participant threads, and trust-unit threads tied to self-only or missing trust units. Counts inflated and labels fell back to generic “Direct chat”.

## Stale cases identified

| Reason | Rule |
|--------|------|
| `no_messages` | `lastMessageAt` is null |
| `solo_participant` | Direct: ≤1 active participant |
| `missing_other_participant` | Direct/group: no other active participant |
| `trust_unit_orphan` | Thread has `trustUnitId` not in viewer’s loaded trust units |
| `trust_unit_inactive` | Trust unit has &lt;2 active members |
| `trust_unit_self_only` | Trust unit is self-only (Agent 79 helper) |

## Display guards added

**`lib/msg-vault/conversation-display-guard.ts`**

- `classifyStaleConversation`, `isStaleMsgVaultConversation`, `filterVisibleConversations`
- Uses `lib/trust/display` for trust-unit membership checks

**Wired into:**

| Surface | Change |
|---------|--------|
| `DashboardPrivateThreadsContext` | Filters list + counts; clears hidden selection |
| `DashboardRailProfile` | Inherits filtered `directConversations` / `threadConversations` |
| `MsgVaultShell` | Filters selector + tab counts; clears stale selection |
| `app/(app)/msg-vault/page.tsx` | Passes `loadTrustUnitsSafe` for TU guards |
| `lib/msg-vault/display.ts` | Direct labels prefer participant names (`participantNames` fallback) |

No Prisma schema changes. No automatic production deletes.

## Cleanup script

**`scripts/msg-vault/cleanup-stale-conversations.ts`**

```bash
npx tsx scripts/msg-vault/cleanup-stale-conversations.ts           # dry-run (default)
npx tsx scripts/msg-vault/cleanup-stale-conversations.ts --apply   # archive empty stale only
```

- Scans all `ACTIVE` conversations with participants and message counts.
- Prints stale candidates grouped by reason.
- **`--apply`:** sets `status = ARCHIVED` only for stale conversations with **zero messages** (messages never deleted).
- Conversations with messages but stale classification are listed but skipped on apply.

## Validation

| Check | Result |
|-------|--------|
| `npm run typecheck` | Pass |
| `npx next build` | Pass (clean `.next` if chunk cache errors) |

## Remaining gaps

- Server `GET /api/msg-vault/conversations` still returns full list; filtering is client-side only.
- `--apply` does not archive stale threads that already have messages (manual review).
- Msg Vault TU guard uses tree `getTrustUnits` shape (no `exitedAt` on members).
