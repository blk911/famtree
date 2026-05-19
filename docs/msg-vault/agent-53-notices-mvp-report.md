# Agent 53 — Msg Vault Notices MVP Report

## Summary

Notices inside Msg Vault now aggregate governance and action events from multiple sources, support mark-read (including derived items), show unread counts on the tab bar and hero header, and display notice context in the right rail when a row is selected.

## Files changed

| Area | Files |
|------|--------|
| Notice services | `lib/msg-vault/notices/index.ts`, `aggregate.ts`, `derived.ts`, `refs.ts`, `sort.ts`, `mark-derived.ts`, `types.ts` |
| API | `app/api/msg-vault/notices/route.ts`, `app/api/msg-vault/notices/[noticeId]/read/route.ts` |
| Client API | `lib/msg-vault/api-client.ts` |
| UI | `components/msg-vault/NoticesPanel.tsx`, `MsgContextRail.tsx`, `MsgVaultShell.tsx` |
| Docs | `docs/msg-vault/agent-53-notices-mvp-report.md` |

No Prisma schema changes.

## Notice sources

| Source | Model / table | What appears |
|--------|----------------|--------------|
| **Persisted** | `AihMsgNotice` | Rows created by Msg Vault (e.g. blocked message) or shadow rows after marking a derived notice read |
| **Approval** | `AihApprovalRequest` | Pending items for **approver** (`APPROVAL_REQUIRED`); resolved items for **requestor** (post/invite outcomes mapped to `POST_APPROVED`, `POST_DENIED`, `INVITE_ACCEPTED`, etc.) |
| **Invite** | `Invite` (family identity-gate; mission “AihInvite”) | Sender-facing: accepted, registered (joined), cancelled, expired — last 90 days |
| **Audit** | `AihAuditEvent` | Membership granted/revoked, trust member added, founder settings, visibility changes, guardian invite approved/declined — scoped to actor, target user, or trust/family units the viewer belongs to |

Derived items use synthetic ids: `derived:{type}:{id}`. Read state for derived items is stored by creating a **READ** `AihMsgNotice` with an embedded `<!--vault-ref:...-->` marker (no schema change).

## Unread behavior

- `GET /api/msg-vault/notices` returns `{ items, unreadCount }`.
- Unread = any item with `status: UNREAD` after merge (persisted + derived).
- **Msg Vault tabs**: red badge on **Notices** tab.
- **Hero header**: “N unread notice(s)” when count &gt; 0.
- **Overview** stat card still shows unread count.

## Mark-read behavior

- `POST /api/msg-vault/notices/[noticeId]/read`
- **Persisted** ids: updates `AihMsgNotice` to `READ` + `readAt` (unchanged from Agent 50).
- **Derived** ids (`derived:…`): creates or updates a shadow notice with vault-ref marker; response keeps the **derived** id for UI consistency.
- UI decrements local unread count and updates row + context rail.

## UI

- **Notices** tab uses the same 3-column grid as chats: list (2 cols) + context rail.
- Selecting a notice shows kind, source, timestamps, context lines, and optional link (Family Safe, tree, msg-vault).
- First notice auto-selected when opening the tab.

## Validation

- `npm run typecheck` — pass
- `npm run build` — run locally (may require stopping dev server on Windows if Prisma `EPERM` on `query_engine`)

## Remaining gaps

1. **No auto-emit** of `AihMsgNotice` when approvals/invites/audit fire — aggregation is read-time + shadow rows on mark-read; other features should call `createNotice()` for real-time fan-out later.
2. **Invitee perspective** — only **sender** `Invite` rows; invitee/guardian views rely on approvals + audit.
3. **Dedicated `INVITE_DECLINED` kind** — not in Prisma enum; declined/cancelled invites use `MEMBER_LEFT` with explicit titles.
4. **90-day window** on derived sources to bound query size.
5. **Global app header** / `getVaultNotificationCount` not wired to Msg Vault unread (in-shell counts only).
6. **Mobile** — notices grid collapses to one column; rail stacks below list.
