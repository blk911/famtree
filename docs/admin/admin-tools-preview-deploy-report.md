# Admin tools — intro preview card missing (debug report)

**Date:** 2026-05-20

## Symptom

`/admin/tools` shows **Member video messages** only. **Current member intro preview** card absent (green `?` in screenshot).

## Root cause

| Finding | Detail |
|---------|--------|
| **Stale production deploy** | Foundation panel showed **SHA `549b575…`** — Trust Unit fix only. Preview card landed in **`e9fd862`**. |
| **Failed newer deploys** | `vercel deploy --prod` failed: `api/profile/cover` traced **658 MB** (300 MB limit). Large `public/uploads/**` (incl. ~46 MB `admin-site-wide-intro.mp4`) pulled into serverless bundles. |

Code was correct in git; production never received `e9fd862`+.

## Repair (shipped)

1. **`next.config.mjs`** — `outputFileTracingExcludes: { "*": ["public/uploads/**"] }` so uploads stay static CDN assets, not function payload.
2. **`MemberVideoToolsPanels`** — repository + preview in one client module (single chunk).
3. **`AdminToolsFoundation`** — Deployment row flags `intro preview ✓` or `missing (need e9fd862+)`.

## Verify after deploy

1. Open `/admin/tools` → two collapsed cards: **Member video messages** (purple) and **Current member intro preview** (blue).
2. Foundation → **Deployment / Git** → SHA ≥ `e9fd862` and **intro preview ✓**.
3. Expand preview → `<video>` plays `/uploads/admin-site-wide-intro.mp4` or enabled row URL.

## If preview still missing

- Vercel dashboard → latest **production** deployment → must be **Ready**, not **Error**.
- Hard refresh (deploy SHA in foundation must update).
