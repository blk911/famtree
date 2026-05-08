# Developer start checklist (famtree)

Repo root: **`C:\dev\famtree`** (adjust path per machine).

Run these **before** touching Trust/Bond/TU logic or merging recovery work:

```bash
git status
```

```bash
git branch
```

```bash
git log --oneline -5
```

```bash
npm run typecheck
```

```bash
npx prisma generate
```

```bash
npx prisma validate
```

```bash
npm run dev
```

**Notes**

- If `prisma generate` fails with **EPERM** on Windows, stop running Node processes (`Get-Process node` / Task Manager) and retry.
- Confirm `.env` / `.env.local` points at the **intended** database URL before `db push` or migrate commands.
