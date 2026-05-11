# Policy Profile Backfill Runbook

Covers how and when to run `scripts/aihsafe/backfill-policy-profiles.ts`.

---

## What it does

Creates `AihPolicyProfile` rows for any users who registered before Agent 38
wired profile creation into the registration route. Idempotent — skips users
who already have a profile row. Never deletes or modifies existing profiles.

---

## When to run

Run once after deploying the Agent 38 branch to any environment that has
existing users (dev, staging, or production).

---

## Pre-run checklist

- [ ] Schema is in sync (`npm run db:push` or migration applied)
- [ ] Prisma client is regenerated (`npm run db:generate`)
- [ ] `DATABASE_URL` points to the correct environment
- [ ] You have confirmed that `aih_policy_profiles` table exists
- [ ] You have confirmed with a `--dry-run` what users will be affected
- [ ] For production: change window is open, on-call is aware

---

## Dev / local run

```bash
# 1. Confirm who is affected (no writes)
npx tsx scripts/aihsafe/backfill-policy-profiles.ts --dry-run

# 2. Apply
npx tsx scripts/aihsafe/backfill-policy-profiles.ts
```

---

## Staging run

Same as dev. Use the staging `DATABASE_URL`.

---

## Production run

**Do NOT run against production without an explicit approval from the team.**

Steps:
1. Run dry-run against a production replica or read-only connection first.
2. Get approval (engineering lead sign-off).
3. Set `DATABASE_URL` to the production connection string.
4. Run in a terminal with logging captured:
   ```bash
   npx tsx scripts/aihsafe/backfill-policy-profiles.ts 2>&1 | tee backfill-$(date +%Y%m%d-%H%M%S).log
   ```
5. Review the log. If any `❌` failures appear, re-run — the script is idempotent.
6. Restore `DATABASE_URL` to the development value immediately after.

---

## What happens for each user tier

| User's DOB | Derived tier | Policy assigned |
|---|---|---|
| None (null) | UNKNOWN | TEEN-conservative: family/trust_unit scopes only, no invites, not discoverable |
| Under 13 | CHILD | Posting blocked, guardian approval required, family scope only |
| 13–15 | PRETEEN | Same as CHILD |
| 16–17 | TEEN | Posting allowed (family/trust_unit), invites blocked by default |
| 18–64 | ADULT | Full posting and invite access |
| 65+ | ELDER | Same as ADULT |

Users with no DOB receive UNKNOWN-conservative defaults. Encourage those users
to provide their DOB via the profile settings page so that `refreshPolicySnapshotIfTierChanged`
can upgrade them to the correct tier on next login.

---

## Rollback

The backfill only inserts new rows (upsert with `update: {}`). To roll back:

```sql
-- Remove profiles created by the backfill (only rows with system_default source
-- and no manual overrides — review before running):
DELETE FROM aih_policy_profiles
WHERE "sourceType" = 'system_default'
  AND "postingPolicy" IS NOT NULL;
```

**Do not run the rollback SQL without reviewing the affected rows first.**
`resolvePolicyProfile()` handles missing profile rows gracefully (returns
system defaults), so the application will continue to function correctly
even if all backfilled rows are deleted.

---

## Verification after backfill

```sql
-- Count users without a policy profile (should be 0 after backfill)
SELECT COUNT(*) FROM users u
LEFT JOIN aih_policy_profiles p ON p."userId" = u.id
WHERE p.id IS NULL;

-- View all profiles by tier
SELECT "ageTierSnapshot", "sourceType", COUNT(*) 
FROM aih_policy_profiles 
GROUP BY "ageTierSnapshot", "sourceType"
ORDER BY "ageTierSnapshot";
```
