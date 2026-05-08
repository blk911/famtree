# Code-only merge checklist — `recovery-famtree-trust-units-working`

**Goal:** Merge **application code** into `main` (or deploy from `main`) **without** migrating local dev/test rows (`users`, `invites`, `sessions`, `trust_unit_*`, etc.).

**Repo:** `C:\dev\famtree`  
**Branch:** `recovery-famtree-trust-units-working`

---

## 1. Pre-flight (run locally before opening PR)

```bash
git status
```

```bash
git branch --show-current
```

Expect: branch `recovery-famtree-trust-units-working`, clean working tree.

```bash
npm run typecheck
```

```bash
npx prisma validate
```

```bash
npx prisma generate
```

If `prisma generate` fails on Windows with **EPERM** renaming `query_engine-windows.dll.node`, stop Node/dev servers and retry (see `docs/recovery-trust-tu-status.md`).

---

## 2. What this branch contains vs `main`

Reconcile against **`origin/main`** before merging:

```bash
git fetch origin
git log --oneline origin/main..HEAD
git diff --stat origin/main...HEAD
```

**Relative to `origin/main` at last check**, this recovery branch carried:

| Expectation | Where it lives |
|-------------|----------------|
| **`connection_requests` ACCEPTED upsert** (bond path) | Commit `beccc73` — `app/api/connections/create-request/route.ts`, related `InviteClient.tsx` refresh behavior |
| **Invite / register Trust Unit hooks** | Landed in Trust/TU commits **already ancestral to `main`** through shared history (e.g. pending-invite TU, register resolution); **no extra diff vs `main`** unless `main` has diverged — confirm with `git diff origin/main...HEAD` |
| **Dashboard / family-vault TU rendering** | Same as above: present on branch tip; compare diff to ensure `main` has not removed files |
| **`typecheck` script** | `package.json` — `"typecheck": "tsc --noEmit"` |

Always trust **`git diff origin/main...HEAD`** over this table if remote `main` moved.

---

## 3. Merge mechanics — **code only**

1. Open PR **into `main`** (compare diff; no force-push to `main`).
2. **Do not** attach DB dumps, CSV exports, or “restore from laptop” steps.
3. **Do not** run `npm run db:seed`, `npm run seed:deb`, or `prisma migrate reset` against production or shared staging without an explicit, reviewed runbook.
4. After deploy, **production users continue** through normal signup/invite flows; **`@test.com` fixtures exist only in local DBs**, not in Git.

---

## 4. Files and layers that touch the database

These exist in the repo; merging **code** does **not** copy local rows into Git or into production.

| Layer | Role on merge / deploy |
|-------|-------------------------|
| **`prisma/schema.prisma`** | Defines schema; production typically syncs via **`prisma db push`** (see `vercel.json`) — updates **structure**, not dev fixture **data**. |
| **`vercel.json`** `buildCommand` | Runs `prisma db push --skip-generate && prisma generate && next build` — **no seed**. |
| **`package.json`** `build` | `prisma generate && next build` — **no seed**. |
| **`prisma/seed.ts`**, **`scripts/seedDeb.ts`** | **Manual** (`npm run db:seed`, `npm run seed:deb`). **Not** invoked by default build or GitHub workflows checked in-repo. |
| **`app/api/**` routes** | **Runtime** reads/writes when users hit APIs after deploy — expected; not bulk import of dev members. |
| **`lib/trust/**`, Trust API routes | TU graph mutations via Prisma / occasional **`$queryRaw` / `$executeRaw`** (e.g. `app/api/trust/respond/route.ts`, parts of `lib/trust/index.ts`, `lib/dashboard/safe-data.ts`) — **behavior**, not packaged dev datasets. |

**Incremental code diff vs `main`** (when `main` was at merge-base `aa284ae`) touched: `app/api/connections/create-request/route.ts`, `app/(app)/invite/InviteClient.tsx`, `package.json`, and recovery docs — all **behavior/schema-script wiring**, not SQLite/Postgres dump files.

---

## 5. Seed / reseed and Git contents

- **Merging the PR does not run seed.** Default build paths omit `db:seed`.
- **`.env`, `.env.local`, `.env.production`, sessions, and DB files are gitignored** — local users/invites/sessions are **not** part of the repository.
- Do **not** commit dumps under `prisma/` or wire CI to `db:seed` without review.

---

## 6. Pull request description (copy-paste)

```markdown
## Summary
Code-only merge: Trust/Bond/Trust Unit handlers and UI paths reviewed on `recovery-famtree-trust-units-working`. Merge **application source**; **do not migrate** local dev/test database rows.

## Data / safety
- **Merge code only** — no DB dump restore from dev laptops.
- **`@test.com` (and similar) accounts are local fixtures only** — they must not be imported into production.
- **Production members** should continue to onboard via the **real invite / registration** flows after deploy.
- **Do not migrate sessions** between environments.
- Treat **`users`**, **`invites`**, **`trust_unit_*`**, **`connection_requests`** as sensitive graph data — backups before any production bulk SQL.

## Deploy notes
- Production schema follows existing **`prisma db push`** / hosting pipeline — **not** `npm run db:seed`.
- Verify smoke paths: dashboard TU surfaces, family vault units/private feed, invite + register with TU hooks, member bond creation (`connection_requests` ACCEPTED path).

See `docs/recovery-merge-plan.md` and `docs/code-only-merge-checklist.md`.
```

---

## Bottom line

| Question | Answer |
|----------|--------|
| Merge repaired **code** into `main`? | **Yes** — via reviewed PR. |
| Carry over **local dev members / invites**? | **No** — never via Git merge. |
