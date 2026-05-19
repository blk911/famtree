# Agent 60 — Legacy Private Post Migration Dry Run

**Branch:** `aihsafe-agent-60-legacy-private-migration-dry-run`  
**Date:** 2026-05-19

---

## Summary

Added a **dry-run-first** migration tool that plans legacy private `Post` threads → Msg Vault conversations/messages. **`--apply`** is implemented with idempotent guards; default mode performs **no writes**.

**No Prisma schema changes.** **No UI changes.** Legacy posts are never deleted.

---

## Files created

| File | Purpose |
|------|---------|
| `scripts/msg-vault/migrate-legacy-private-posts.ts` | CLI entry (`--dry-run` default, `--apply`, `--json`, production guard) |
| `lib/msg-vault/migration/legacy-private-posts.ts` | Plan builder + apply logic |
| `docs/msg-vault/legacy-private-migration-runbook.md` | Operator runbook |
| `docs/msg-vault/agent-60-legacy-private-migration-report.md` | This report |

**Also:** `package.json` scripts `migrate:private-posts` / `migrate:private-posts:apply`

---

## Dry-run behavior

1. Load eligible posts (`PRIVATE` or `FAMILY` with visibility rows; excludes space scopes).
2. Skip: no visibility, empty body+image, inactive/missing users, already migrated, self-only threads.
3. Group by sorted participant key (matches `private-thread-model.ts`).
4. Classify TU vs direct (2-party) vs group thread.
5. Detect existing vault rows (`directKey`, `trustUnitId`, migrated group `legacyThreadKey`).
6. Print counts: posts, conversations, participants, messages to create, skips, duplicate risks, sample threads.

---

## Apply behavior (included)

Enabled only with **`--apply`** (and `--allow-production` for prod-looking URLs).

- Creates/reuses conversations and participants
- Inserts messages with historical timestamps
- Appends image URLs into body as `[attachment: …]` when needed
- Writes `LEGACY_POST_IMPORTED` governance events for per-post idempotency
- Sets `policySnapshot` with `sourceType: "migrated"`, `preGovernanceLegacy: true`, `migration.legacyThreadKey`
- One transaction per thread group; errors collected per thread

---

## Idempotency strategy

Without `migratedFromPostId` column (deferred to future schema agent):

| Artifact | Mechanism |
|----------|-----------|
| Direct conversation | Unique `directKey` |
| TU thread | Existing row with same `trustUnitId` |
| Group thread | `policySnapshot.migration.legacyThreadKey` |
| Message / post | `AihMsgGovernanceEvent` type `LEGACY_POST_IMPORTED`, `contextJson.legacyPostId` |

---

## Risks

| Risk | Mitigation |
|------|------------|
| Duplicate messages in existing vault chats | Merge into existing `directKey` / TU thread; post-level event prevents re-import |
| Ungoverned legacy pairs imported | `preGovernanceLegacy` in snapshot; governance still enforced on new sends |
| Group thread without TU match | Separate THREAD row keyed by `legacyThreadKey` |
| Large prod dataset | Run dry-run first; apply in maintenance window |
| JSON filter / DB variance | Group lookup uses in-memory match on `policySnapshot` |
| Comments/likes on posts | Not migrated (v1) |

---

## Validation

| Check | Result |
|-------|--------|
| `npm run typecheck` | Pass |
| `npm run build` / `npx next build` | Run in CI (local Prisma lock may affect full `npm run build`) |
| Script dry-run | Run locally: `npm run migrate:private-posts` |

---

## Next steps

1. Review dry-run output on staging
2. `--apply` on staging; verify Dashboard + Msg Vault parity
3. Optional schema agent: `migratedFromPostId` on `AihMsgMessage` for simpler queries
4. Production apply after sign-off (`--allow-production`)
