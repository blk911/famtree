# Disconnect a prebuilt Studio binding

When a member was wired to a **demo studio** (e.g. Deb Dazzle / `deb-dazzle`) for modeling, they can be stuck on `/studios/deb-dazzle` or old browser drafts instead of the **neutral template** at `/studios/start`.

## What caused it

| Mechanism | Effect |
|-----------|--------|
| `users.tenant_id = 'deb-dazzle'` | Sidebar + nav sent user to `/studios/deb-dazzle` (fixed in code — tenant no longer used for routing) |
| `studios.ownerId` = user | User treated as owner of a persisted studio slug |
| `localStorage` `amih_studios_*` drafts | Old fitness/deb copy in the builder |

Deb seed (`npm run seed:deb`) only sets `tenant_id` on **deb@debdazzles.com**. Spencer or other accounts were likely linked manually or via an owned `studios` row.

## Fix for one user (DB)

Dry-run:

```bash
npx tsx scripts/disconnect-user-studio-binding.ts --email=blk911@gmail.com
```

Apply:

```bash
npx tsx scripts/disconnect-user-studio-binding.ts --email=blk911@gmail.com --apply --role=member
```

This clears `tenant_id`, deletes **owned** `studios` rows for that user, and optionally resets `role` to `member`.

Production (Neon):

```bash
npm run prod:env
# point DATABASE_URL at .env.production.local, then same command with --apply
```

## After disconnect

1. User signs in → **AIH Studios** nav goes to `/studios/start` (neutral template).
2. Profile still hydrates name/email/phone/location into the editor — that is intentional.
3. If old hero copy persists, clear site data for the origin or remove keys matching `amih_studios_` in DevTools → Application → Local Storage.

Neutral template draft key is `amih_studios_neutral_base_draft_v2` (bumped so stale v1 deb-tainted drafts are ignored).

## Code changes (routing)

- `getCurrentUserStudioHref` — only `studiosOwned[0].slug` → `/studios/[slug]`; else `/studios/start`
- `getEditorPreviewSlug` — owned studio only (no `tenantId`)

New members should use **Family Safe → Spaces → Create Published Studio** or `/studios/start` directly.
