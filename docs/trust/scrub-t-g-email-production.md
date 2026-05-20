# Scrub `t***@g***` Trust Unit artifacts on **production**

The dashboard mask `t***@g***` means the invite `recipientEmail` starts with **`t`** and the domain starts with **`g`** (e.g. `test@gmail.com`, `tom@gmail.com`). It is **not** stored literally as `t***@g***` in the database.

Local/dev Neon may be clean while **Vercel production** uses a different `DATABASE_URL`.

---

## 1. Get the production connection string

**Easiest (CLI, logged into Vercel):**

```powershell
cd c:\dev\famtree
npm run prod:env
```

Writes `.env.production.local` (gitignored). Then:

```powershell
npm run prod:find-tg
npm run prod:scrub-t-g:apply
```

Manual alternatives:

- **Vercel** → Project → Settings → Environment Variables → **Production** → `DATABASE_URL`  
- **Neon** → production branch → connection string

---

## 2. Point the CLI at production (PowerShell)

```powershell
cd c:\dev\famtree

# Paste production URL for this session only (do not commit)
$env:DATABASE_URL = "postgresql://...."

# Confirm which DB you hit
npx tsx scripts/find-tg-artifacts.ts
```

You should see `DATABASE host:` matching your **production** Neon host (not necessarily the same as local `.env.local`).

---

## 3. Find (dry-run)

```powershell
npm run trust:scrub-t-g-email
npm run trust:repair-pending
```

Lists:

- Matching **invites** (raw email + status)
- **TrustUnitRequestPendingInvite** rows
- Pending **TrustUnitRequest** proposals to decline after slot removal

---

## 4. Remove (apply)

```powershell
npm run trust:scrub-t-g-email:apply
npm run trust:repair-pending:apply
```

Then verify:

```powershell
npx tsx scripts/find-tg-artifacts.ts
```

Expect: `Invites matching mask t***@g***: 0`, `Total trustUnitRequestPendingInvite rows: 0`.

---

## 5. If you know the exact email

```powershell
npm run trust:scrub-t-g-email:apply -- --email=someone@gmail.com
```

---

## 6. Optional: Neon SQL (read-only find)

```sql
SELECT id, "recipientEmail", status, "senderId", "createdAt"
FROM invites
WHERE LOWER("recipientEmail") LIKE 't%'
  AND LOWER("recipientEmail") LIKE '%@g%';

SELECT s.id, s."requestId", i."recipientEmail"
FROM trust_unit_request_pending_invites s
JOIN invites i ON i.id = s."inviteId"
WHERE LOWER(i."recipientEmail") LIKE 't%'
  AND LOWER(i."recipientEmail") LIKE '%@g%';
```

Delete via scripts above (handles TU decline + approvals), not raw SQL, unless you know the full graph.

---

## 7. After data scrub

1. **Deploy** the build that disables auto-TU on `POST /api/invite` (prevents new ghost slots).  
2. Have affected users **hard refresh** `/dashboard` (repair also runs on load).  
3. Confirm **Admin → Invites** and **Trust Unit approvals** no longer show the row.

---

## What gets removed

| Artifact | Action |
|----------|--------|
| `invites` row (`t*@g*`) | Deleted |
| `trust_unit_request_pending_invites` | Deleted |
| Parent `trust_unit_requests` if &lt; 3 people left | Status → `DECLINED` |
| `trust_unit_approvals` on declined request | → `DECLINED` |

No user accounts are deleted — only invite + proposal rows.
