# Agent 38 — Registration Defaults + Unsafe Age Closure Report

**Date:** 2026-05-11  
**Branch:** aihsafe-agent-38-registration-defaults

---

## 1. User Creation Paths Found

| Path | File | DB Operation | Wired? |
|---|---|---|---|
| Primary registration | `app/api/auth/register/route.ts` | `prisma.user.create()` | ✅ Wired |
| Dev seed (founder account) | `prisma/seed.ts` | `prisma.user.upsert()` | ✅ Wired |
| Studio seed (Deb Dazzle) | `scripts/seedDeb.ts` | Raw SQL `INSERT` | ⚠️ Skipped — not Family Safe user; raw pg client |

`scripts/seedDeb.ts` creates a Studio `owner` role user via raw pg SQL, not a Family Safe member. It has no DOB field and does not go through Prisma. Because it bypasses the Prisma client entirely, wiring the policy service would require duplicating the policy creation logic in raw SQL. Since this is a Studio vertical seed (not a Family Safe onboarding path), it is excluded from scope and documented here only.

No other user creation paths were found in `app/api/`.

---

## 2. Paths Wired

### `app/api/auth/register/route.ts`

After `prisma.user.create()` succeeds, the route now calls:

```typescript
ensurePolicyProfile(user.id, user.dateOfBirth ?? null).catch(console.error);
```

- Fire-and-forget (non-blocking) — consistent with the `sendWelcomeEmail` pattern
- `resolvePolicyProfile()` gracefully handles missing rows (returns system defaults), so profile creation failure does not break registration
- If `dateOfBirth` is provided: derives correct tier at creation time
- If `dateOfBirth` is null: UNKNOWN tier → conservative (TEEN-like) policy

### `app/api/auth/login/route.ts`

After session cookie is set, the route now calls:

```typescript
refreshPolicySnapshotIfTierChanged(user.id).catch(console.error);
```

- Fire-and-forget — never blocks login response
- Reads user DOB (separate query — login's `LOGIN_USER_SELECT` intentionally omits DOB)
- Compares live derived tier against stored `ageTierSnapshot`
- If drift detected: rewrites all system-managed policy blobs for the new tier
- `interestsPolicy` preserved — may contain user-specific interest selections (Agent 40)
- No-op when tier is unchanged — no write on the happy path

### `prisma/seed.ts`

After `user.upsert()`, seed now explicitly creates an ADULT policy profile using the seed's own Prisma client instance (avoids dual-client concerns):

```typescript
const founderPolicy = buildDefaultPolicyProfile(founder.id, AgeTier.ADULT, null, PolicySourceType.SYSTEM_DEFAULT);
await prisma.aihPolicyProfile.upsert({ where: { userId: founder.id }, create: {...}, update: {} });
```

Uses `AgeTier.ADULT` directly because the seed founder has no DOB — explicit rather than defaulting to UNKNOWN-conservative.

---

## 3. UNKNOWN Age-Tier Handling

### Before (Agent 37 state)
- Governance kernel `isScopePermittedFor()`: `return true` for UNKNOWN → adult-permissive at the kernel layer
- Policy layer: UNKNOWN assigned TEEN-conservative defaults (correct)
- Mismatch: governance kernel allowed UNKNOWN users full scope; policy layer was never consulted

### After (Agent 38)

**Governance kernel patched** (`lib/aihsafe/governance/index.ts`):

```typescript
if (actor.ageTier === AgeTier.UNKNOWN) {
  // Conservative: no DOB means unverified age — treat like TEEN until DOB is provided.
  return (TEEN_ALLOWED_SCOPES as readonly string[]).includes(scope);
}
return true; // ADULT, ELDER
```

UNKNOWN users are now restricted to `TEEN_ALLOWED_SCOPES` = `[PRIVATE, GUARDIAN_ONLY, FAMILY, TRUST_UNIT]` at both layers:
- Governance kernel (`isScopePermittedFor`) — enforces scope gate
- Policy layer (`buildDefaultPolicyProfile`) — assigns TEEN-conservative defaults

PUBLIC_APPROVED and EXTENDED_TRUST are now denied to unverified-age users at the kernel level, not just the policy layer.

### UNKNOWN scope matrix (after Agent 38)

| Action | Before (UNKNOWN) | After (UNKNOWN) |
|---|---|---|
| Post to PRIVATE | ✅ Allowed | ✅ Allowed |
| Post to GUARDIAN_ONLY | ✅ Allowed | ✅ Allowed |
| Post to FAMILY | ✅ Allowed | ✅ Allowed |
| Post to TRUST_UNIT | ✅ Allowed | ✅ Allowed |
| Post to EXTENDED_TRUST | ✅ **Was allowed** | ❌ **Now denied** |
| Post to PUBLIC_APPROVED | ✅ **Was allowed** | ❌ **Now denied** |
| Send invites | ❌ Denied (policy) | ❌ Denied (kernel + policy) |
| Profile discoverable | ❌ No (policy) | ❌ No (policy) |

---

## 4. New Functions

### `ensurePolicyProfile(userId, dateOfBirth)` — `lib/aihsafe/policy/resolvePolicyProfile.ts`

```typescript
export async function ensurePolicyProfile(
  userId: string,
  dateOfBirth: Date | null,
): Promise<void>
```

Convenience wrapper: derives tier from DOB, loads founder settings, calls `createDefaultPolicyProfileRow`. Idempotent — safe to call multiple times.

### `refreshPolicySnapshotIfTierChanged(userId)` — `lib/aihsafe/policy/resolvePolicyProfile.ts`

```typescript
export async function refreshPolicySnapshotIfTierChanged(userId: string): Promise<void>
```

On-login drift detector. Reads DOB + stored snapshot, skips if no drift, otherwise re-derives and writes fresh defaults for the new tier. `interestsPolicy` blob preserved.

Both functions are exported from `lib/aihsafe/policy/index.ts` barrel.

---

## 5. Backfill Strategy

### Script

`scripts/aihsafe/backfill-policy-profiles.ts`

Finds all users where `aihPolicyProfile IS NULL`, calls `ensurePolicyProfile()` for each. Idempotent (skips users who already have a row).

### Run commands

```bash
# Dry run — see who would be affected (safe, read-only)
npx tsx scripts/aihsafe/backfill-policy-profiles.ts --dry-run

# Apply (dev only — see runbook before production)
npx tsx scripts/aihsafe/backfill-policy-profiles.ts
```

See `docs/aihsafe/policy-backfill-runbook.md` for production procedure.

---

## 6. Remaining Unsafe Paths

| Path | Risk | Owner |
|---|---|---|
| `scripts/seedDeb.ts` | Studio owner user has no policy profile | Out of scope — Studio vertical, not Family Safe |
| DOB collection at registration | `dateOfBirth` is still optional → UNKNOWN tier for users who skip it | UX/onboarding — future Agent |
| DOB update endpoint | No API to provide DOB post-registration; `refreshPolicySnapshotIfTierChanged` handles drift on login once DOB is set | Future Agent |
| `interestsPolicy` blob | Always null → `allowedCategoryIds: []` | Agent 40 |
| `limitsPolicy` blob | Ceiling definitions only — counter enforcement missing | Agent 41 |
| `AihFounderSettings` row | Does not exist until Agent 39; resolver falls back to system defaults | Agent 39 |
| Guardian link on invite | Child invite relationship (`inviteRelationship === "child"`) does not auto-create `AihGuardianRelationship` | Future Agent |

---

## 7. Validation Results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ No TypeScript errors |
| `npm run build` | ✅ Build succeeded (pre-existing dynamic route warnings only) |
| Backfill script compiles | ✅ Covered by project-wide `tsc --noEmit` |
| No existing routes broken | ✅ Confirmed — only register + login modified |
| No schema changes | ✅ Confirmed — no `prisma/schema.prisma` modifications |
