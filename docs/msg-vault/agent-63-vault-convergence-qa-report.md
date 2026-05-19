# Agent 63 — Vault Convergence QA / Security Pass

**Branch:** `aihsafe-agent-63-vault-convergence-qa`  
**Base commit:** `b59af1d` — *Converge dashboard private threads with Msg Vault*  
**Date:** 2026-05-19

---

## Summary

QA and security review of the Dashboard Private Threads → Msg Vault convergence stack (Agents 59–62). No Prisma schema changes. No new product features. Three small fixes applied (TU thread dedupe, direct-key lookup, message retry race guard).

---

## 1. Files modified (Agent 63)

| File | Change |
|------|--------|
| `lib/msg-vault/conversations/index.ts` | Reuse existing ACTIVE trust-unit thread on `createThreadConversation` (prevents duplicate TU threads) |
| `components/vault/DashboardPrivateThreadsContext.tsx` | Resolve direct peer via `directKey` before participant fallback |
| `components/dashboard/DashboardPrivateThreadCenter.tsx` | `loadMessages` retry respects `messagesLoadSeqRef` (stale fetch guard) |
| `docs/msg-vault/agent-63-vault-convergence-qa-report.md` | This report |

---

## 2. QA flows tested

| # | Flow | Method | Result |
|---|------|--------|--------|
| 1 | Migration dry-run idempotent | `npm run migrate:private-posts` ×2, `Compare-Object` | **Pass** — identical output |
| 2 | Migration apply idempotent (dev) | `npm run migrate:private-posts:apply` ×2 on `localhost:5432/famtree` | **Pass** — 0 legacy posts; second run 0 creates |
| 3 | Dashboard Posts tab | Code path review — `DashboardHubColumns` still uses feed posts RSC | **Pass** (unchanged) |
| 4 | Dashboard Private Threads loads vault conversations | `DashboardPrivateThreadsProvider` → `GET /api/msg-vault/conversations` | **Pass** |
| 5 | Right rail opens direct | `openDirectPeer` → `POST` direct or select existing | **Pass** |
| 6 | Right rail opens trust unit | `openTrustUnit` → `POST` thread or select existing | **Pass** (server dedupe added) |
| 7 | Send message persists after refresh | `MessageComposer` → POST messages; reload via `fetchMessages` limit 100 | **Pass** (code review) |
| 8 | `/msg-vault` same conversation store | Same APIs + `MsgVaultShell` | **Pass** |
| 9 | Notices tab | `NoticesListPane` + `MsgContextRail` notice profile | **Pass** (code review) |
| 10 | Context rail per selection | `MsgContextRail` DIRECT / THREAD / NOTICE / DEFAULT | **Pass** |
| 11 | No legacy private accordion | Grep — only admin Settings accordion in `AppSidebar` | **Pass** |
| 12 | No console noise in vault/dashboard private paths | Grep `console.error` in `components/{dashboard,vault,msg-vault}` | **Pass** |
| 13 | Mobile layout `<860px` | `thread-hub-grid` / `msg-vault-grid` order rules in `globals.css` | **Pass** (CSS review; manual visual QA recommended) |
| 14 | Empty states | `EmptyThreadState` variants `pick`, `no-messages`, `no-threads` | **Pass** |
| 15 | No duplicate thread list columns | Msg Vault: single right selector; Dashboard: one vault list in Private Threads card + tree/TU pickers (intentional) | **Pass** |

**Not run in browser this session:** interactive send/refresh, child-account login, founder flag toggle UI. Recommend manual spot-check before production merge.

---

## 3. Security checks

| Check | Enforcement | Result |
|-------|-------------|--------|
| Child cannot message non-governed peer | `createDirectConversation` → `canMessage()` (`lib/aihsafe/governance`) | **Pass** (server-side) |
| TU non-member cannot read thread | `requireActiveParticipant` / `loadConversationForParticipant` on GET detail + messages | **Pass** |
| `enablePrivateThreads: false` blocks new thread | `createThreadConversation` throws validation error | **Pass** |
| Direct chat still allowed when flag false | `createDirectConversation` does not check flag (by design) | **Pass** (documented) |
| Existing thread read when flag false | List/detail/messages require ACTIVE participant only | **Pass** |
| No public discovery / open DMs | `listAllowedChatContacts` + `canMessage` graph gates | **Pass** |
| Non-participant GET conversation | Returns 404 via `notFound()` (no leak) | **Pass** |

**Not executed:** live child/stranger integration test (no seeded minor + stranger pair in local DB during this pass).

---

## 4. Bugs fixed (Agent 63)

1. **Duplicate trust-unit threads** — Each TU header click could `POST` a new thread. Server now returns the newest ACTIVE `THREAD` / `SPACE_THREAD` for that `trustUnitId` if one exists.
2. **Direct peer resolution fragile** — Client matched by `participants` only (list DTO may truncate). Now prefers `directKey` via `makeDirectConversationKey`.
3. **Message retry race** — “Try again” on message load could apply stale results after switching conversations. `loadMessages` now uses `messagesLoadSeqRef`.

---

## 5. Remaining gaps (not fixed — out of scope)

| Gap | Notes |
|-----|--------|
| Legacy PRIVATE posts invisible until migration | Local DB had 0 eligible posts; production may differ |
| `POST /api/profile/posts` `scope: PRIVATE` still allowed elsewhere | Phase 4 legacy removal not done |
| Mark-read API not wired | Unread dots are heuristic (`lastReadAt` vs `lastMessageAt`) |
| Message pagination UI | API supports cursor/`hasMore` (max 100/page); UI loads 100 only — threads with >100 messages truncate |
| 500-message load test | Not run; API clamp `limit` ≤ 100 |
| Deleted legacy posts | Migration skips via governance events; live `Post` delete does not remove vault messages |
| Unread badge parity | Dashboard CTA still uses legacy comment counts for some tabs |
| Manual browser QA | Send/refresh, mobile, child flows — recommended before merge |
| Automated security tests | No `*.test.*` for msg-vault routes |

---

## 6. Validation results

| Command | Result |
|---------|--------|
| `npm run migrate:private-posts` (×2) | Pass — identical |
| `npm run migrate:private-posts:apply` (×2, localhost) | Pass — 0 writes, idempotent |
| `npm run typecheck` | Pass |
| `npx next build` | Pass |

---

## 7. Merge readiness

**Merge-ready with documented gaps:** Yes, for the convergence stack on `aihsafe-agent-63-vault-convergence-qa`, subject to:

- Committing Agent 63 small fixes (3 files above).
- Manual QA on staging (send + refresh, mobile, child governance) if not already done.
- **Do not** run `migrate:private-posts:apply` on production without stakeholder sign-off and backup.

Production migration and Phase 4 legacy write-block remain follow-up work, not blockers for this UI/API convergence branch.

---

## References

- `docs/msg-vault/dashboard-msg-vault-convergence-roadmap.md` (Phase 5 checklist)
- `docs/msg-vault/agent-57-thread-consistency-qa-report.md`
- `docs/msg-vault/agent-58-thread-data-convergence-plan.md`
- `docs/msg-vault/agent-59-dashboard-private-to-msg-vault-report.md`
- `docs/msg-vault/agent-60-legacy-private-migration-report.md`
- `docs/msg-vault/agent-61-msg-vault-switch-qa-report.md`
- `docs/msg-vault/agent-62-context-rail-report.md`
