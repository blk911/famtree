# Agent 76 — Production governance / build debug report

**Date:** 2026-05-19  
**Reporter:** Spencer Wendt (`amihuman.net`)  
**Symptoms:**
1. Vercel build failed: `getFamilyGovernance` not exported from `apiClient`
2. Live site: no **Msg Rules** / **Boundaries** tab on Family Safe; hero says **Msg Vault**
3. Expectation: rules visible on “profile” — actually live under **Family Safe**, not `/profile`

---

## Root cause summary

Three separate issues stacked:

| # | Issue | Why you saw it |
|---|--------|----------------|
| 1 | **Broken deploy (commit `af714d9`)** | Pushed `FamilySettingsView.tsx` that imports `getFamilyGovernance` **before** `apiClient.ts` gained that export. Vercel build failed → production never updated. |
| 2 | **Production still on `main`** | `amihuman.net` deploys `main`. Agent 69–76 work is on `aihsafe-agent-76-real-relationship-simulation`. Until **merge + successful deploy**, live users keep old UI. |
| 3 | **Old `main` routing** | On `main`, sidebar **Msg Vault → `/aihsafe`** (one link). Member shell tabs = Overview, Spaces, Activity, Members — **no Settings tab**. Hero eyebrow hard-coded **“Msg Vault”** on the Family Safe page. |

Commit **`4502218`** fixes (1) and includes (2)’s code. This follow-up adds hero eyebrow **“Family Safe”** on `/aihsafe`.

---

## Build error (Vercel log 16:34)

```
FamilySettingsView.tsx:5:10
Module '"@/components/aihsafe/common/apiClient"' has no exported member 'getFamilyGovernance'.
```

| Commit | `apiClient.getFamilyGovernance` | `family-governance` API | Build |
|--------|--------------------------------|-------------------------|-------|
| `af714d9` | ❌ Missing | ❌ Missing | **Fails** |
| `4502218` | ✅ Present | ✅ Present | **Passes** |
| `main` (current prod) | ❌ N/A (no FamilySettingsView) | ❌ | Old UI |

**Action:** Redeploy branch at `4502218` or later, or merge to `main` and deploy.

---

## Why Spencer sees 4 tabs (no Msg Rules)

Screenshot matches **`main`** behavior for `shellMode === "member"`:

```text
Tabs on main (member):  Overview | Spaces | Activity | Members
Tabs after Agent 69+ (member):  … | Members | Msg Rules
Tabs (founder):  … | Approvals | Msg Rules
```

**Spencer’s account on production** is almost certainly routed as **member shell**, not founder:

- `deriveShellMode()` returns `"founder"` only when `user.role` is `founder` or `admin`.
- If Spencer is `role: "member"` in the DB, he gets the **member** tab set (and on `main`, no settings tab at all).

**Check in Admin → Members or DB:**

```sql
SELECT email, role, "dateOfBirth" FROM "User" WHERE email ILIKE '%blk911%' OR "firstName" ILIKE 'Spencer%';
```

- Site **founder** (`founder@famtree.test`) ≠ family **steward** unless the same user has `role = founder`.
- To edit Msg Rules in UI: need `role` in (`founder`, `admin`) **or** read-only **Msg Rules** tab as member (after deploy).

---

## Profile vs Family Safe vs Msg Vault

| URL | Purpose | Rules / Boundaries? |
|-----|---------|-------------------|
| `/profile` | Timeline, photos, posts | **No** — social profile only |
| `/aihsafe` | Family Safe — spaces, activity, governance | **Yes** — **Msg Rules** or **Boundaries** tab (after deploy) |
| `/msg-vault` | Governed DMs, notices | Messaging only; not rule editor |

Rules are **not** missing from profile by bug — they were never on `/profile`. After deploy, use **Family Safe** (sidebar) → **Msg Rules** tab.

---

## Sidebar confusion (production `main`)

On **`main`**:

```ts
const MSG_VAULT_HREF = "/aihsafe";  // Msg Vault label opens Family Safe
```

On **agent-76 branch**:

```ts
const MSG_VAULT_HREF = "/msg-vault";
const FAMILY_SAFE_HREF = "/aihsafe";  // separate Family Safe link
```

So on production, clicking **Msg Vault** opens `/aihsafe` with a **Msg Vault** hero — looks like one product, hides **Family Safe** as a concept.

---

## Fixes in repo (agent-76 branch)

1. **`4502218`** — Full wire-up: `getFamilyGovernance`, API route, tabs, `FounderShell`, sidebar split.
2. **This patch** — `VaultHeroSection` `eyebrow="Family Safe"` on `/aihsafe` (was hard-coded “Msg Vault”).

---

## Deploy checklist for `amihuman.net`

1. Merge `aihsafe-agent-76-real-relationship-simulation` → `main` (or deploy preview branch).
2. Confirm Vercel build **green** (not stuck on failed `af714d9`).
3. `prisma db push` runs on build — confirm invite-intent columns if using new invites.
4. Hard refresh / clear cache after deploy.
5. Verify Spencer `role` if he should see founder editor vs read-only Msg Rules.
6. Smoke test:
   - `/aihsafe` → hero says **Family Safe**, tabs include **Msg Rules** (or **Boundaries** for minors)
   - `/msg-vault` → messages
   - `/profile` → unchanged (no rules tab expected)

---

## Validation

```bash
npm run typecheck
npx next build
npm run verify:visible-governance
```

---

## Remaining product gaps (not blockers for deploy)

- Trusted adult → child link still manual (People tab)
- UNKNOWN DOB onboarding prompt
- Optional: profile link “View your Boundaries / Msg Rules in Family Safe”
