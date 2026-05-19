# Legacy Private Post Migration — Runbook

**Script:** `scripts/msg-vault/migrate-legacy-private-posts.ts`  
**Library:** `lib/msg-vault/migration/legacy-private-posts.ts`

---

## Purpose

Map legacy dashboard private threads (`Post` with `scope: PRIVATE` or `FAMILY` + `PostVisibility`) into Msg Vault (`AihMsgConversation` / `AihMsgMessage`) without deleting source posts.

---

## Prerequisites

- `DATABASE_URL` set (`.env` loaded via Next env config)
- Prisma client generated (`npm run db:generate`)
- **Human approval** before any `--apply` on shared/staging/production databases

---

## Commands

| Command | Effect |
|---------|--------|
| `npm run migrate:private-posts` | Dry-run (default) — report only |
| `npx tsx scripts/msg-vault/migrate-legacy-private-posts.ts --dry-run` | Same |
| `npx tsx scripts/msg-vault/migrate-legacy-private-posts.ts --json` | JSON summary (dry-run) |
| `npm run migrate:private-posts:apply` | **Writes** conversations/participants/messages |
| `… --apply --allow-production` | Apply when `DATABASE_URL` looks like production (use only after sign-off) |

---

## Recommended workflow

1. **Local / dev copy** — run dry-run, review counts and skip reasons.
2. **Stakeholder review** — share `--json` output or report doc.
3. **Staging** — dry-run, then `--apply` on staging DB.
4. **Verify** — open Dashboard Private Threads and Msg Vault; confirm history appears.
5. **Production** — dry-run on prod read replica or prod (read-only OK); apply only with `--allow-production` after explicit approval.

---

## What the script does

### Dry-run

- Scans eligible legacy posts
- Groups by legacy `participantKey` (same as `private-thread-model.ts`)
- Classifies DIRECT (2 participants), TU THREAD (`tuThreadKey`), or group THREAD
- Reports messages to create, skips, duplicate/merge risks, missing users
- **No database writes**

### Apply

Per thread group (transaction):

1. Reuse or create `AihMsgConversation` (`directKey` / `trustUnitId` / `policySnapshot.migration.legacyThreadKey`)
2. Add missing `AihMsgParticipant` rows
3. Insert `AihMsgMessage` per post (preserves `createdAt` / `updatedAt`)
4. Record `AihMsgGovernanceEvent` `LEGACY_POST_IMPORTED` with `contextJson.legacyPostId`
5. Update `lastMessageAt`
6. **Never deletes** `Post` rows

---

## Idempotency

| Layer | Key |
|-------|-----|
| Direct chat | `AihMsgConversation.directKey` (unique) |
| Trust unit thread | `trustUnitId` + `kind: THREAD` |
| Legacy group | `policySnapshot.migration.legacyThreadKey` |
| Per post | Governance event `LEGACY_POST_IMPORTED` + `legacyPostId` |

Re-running `--apply` skips posts already recorded in governance events.

---

## Production guard

`--apply` aborts when `DATABASE_URL` appears to be production (e.g. Neon/Vercel host) unless `--allow-production` is passed.

---

## Rollback

- Legacy posts remain intact
- Vault rows created by migration can be identified via `policySnapshot.sourceType = "migrated"` and `LEGACY_POST_IMPORTED` events
- Manual cleanup (if ever needed) is a separate approved operation — not automated here

---

## Related docs

- `docs/msg-vault/legacy-private-post-migration-map.md`
- `docs/msg-vault/agent-58-thread-data-convergence-plan.md`
- `docs/msg-vault/agent-59-dashboard-private-to-msg-vault-report.md`
