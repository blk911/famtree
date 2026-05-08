# Recovery branch → production merge plan

## Roles

| Branch | Role |
|--------|------|
| **`main`** | Production comparison target and deployment baseline for the live app. |
| **`recovery-famtree-trust-units-working`** | Source branch that carries Trust / Bond / Trust Unit repairs and related UX fixes. |

## Rules

1. **No direct overwrite of `main`** — no force-push of recovery onto `main`, no “replace repo with zip” workflows.
2. **Compare via PR first** — GitHub (or equivalent) diff review before merge.
3. **Preserve online behavior** — merging code must not assume production data matches local; feature-flag or gate risky migrations.
4. **Migrate data separately from code** — schema follows Prisma migrations / controlled `migrate deploy`; content moves via explicit scripts with backups.
5. **Never migrate sessions** — drop or recreate sessions in target env rather than copying session tables across environments (security + incompatibility).
6. **Sensitive graph data** — treat `users`, `invites`, `trust_unit_*`, `connection_requests`, and related FK rows as **production-critical**; backups before any bulk update.

## Suggested merge sequence

1. Ensure recovery branch is green locally: `npm run typecheck`, smoke tests (see `recovery-trust-tu-status.md`).
2. Open PR **recovery → main**; review file-level diff and migration notes.
3. Deploy **staging** with production-like DB snapshot **read-only** first if possible.
4. Apply **code** merge to `main` after approval.
5. Run **`prisma migrate deploy`** (or project-standard migrate) on production — **not** ad-hoc destructive SQL.
6. **Data backfills** (if any) run as separate, logged jobs — not mixed into app boot.

## Rollback

- Keep previous deployment artifact and DB snapshot point-in-time before migrate.
- Revert Git merge commit if needed; avoid rewriting public `main` history.
