# Agent 115 — Studios split: explore vs build

## Goal

`/studios` reads as **public explore / storytelling**. Logged-in **builder utilities** leave the hero and move into the slim top breadcrumb strip next to AIH navigation.

## Files modified / added

| Path | Purpose |
|------|---------|
| `components/studios/StudiosLandingClient.tsx` | Removed the large authenticated Create Studio banner above Fold 1; hero stays narrative + explore links + featured playlist/carousel. |
| `app/studios/page.tsx` | Drops prisma draft prefetch (was only feeding the removed banner props). |
| `components/studios/MemberBreadcrumb.tsx` | Adds `StudiosUtilityBar` to the top-right cluster before **Edit profile**. |
| `components/studios/landing/StudiosUtilityBar.tsx` | **New** muted pills + “Logged in as …”. |
| `app/studios/drafts/page.tsx` | **New** — lists owner drafts → `/studios/create?draftId=…`; `dynamic = force-dynamic`. |
| `app/studios/my-studios/page.tsx` | **New** — lists owned studios → `/studios/[slug]`; `dynamic = force-dynamic`. |

`StudiosMemberCreateCta.tsx` remains but is **unused** by the landing page after this split.

`app/globals.css` — unchanged.

## Removed hero redundancy

- Eliminated the **full-width Create Studio / Build+Start utility strip** that competed with the editorial hero.
- No duplicate build/start CTAs in the hero column (only **Explore Gap U** · **See live pages** under the pitch).

## Utility bar

| Control | Route |
|---------|--------|
| Create Studio | `/studios/create` |
| Drafts | `/studios/drafts` |
| My Studios | `/studios/my-studios` |

Anonymous users: no breadcrumb bar (unchanged). Member pages require login with `returnTo` on drafts / my-studios.

## Responsive behavior

`MemberBreadcrumb` + `StudiosUtilityBar` use **`flexWrap`** and tight gaps so narrow viewports stack without horizontal overflow.

## Validation

- `npm run typecheck` — exit **0**
- `npx next build` — exit **0** (`Compiled successfully`)

## Branch & commit

- Branch: `studios-agent-115-split-explore-vs-build`
- **Commit:** `a607250` — Separate Studios explore and build experiences

(`git add .` was narrowed to Agent 115 paths only — unrelated untracked admin/debug artifacts were omitted.)
