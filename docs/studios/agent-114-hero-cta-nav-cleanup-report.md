# Agent 114 — Studios hero CTA nav cleanup

## Summary

Reduced competing hero CTAs by moving authenticated **Build / Start** flows into the top **Create Studio** strip and demoting exploration links to subtle text-style links directly under the pitch paragraph.

## Files modified

| File | Change |
|------|--------|
| `components/studios/StudiosMemberCreateCta.tsx` | Banner rework: paired **Build Studio** + **Start Studio** buttons; subtitle copy unchanged for new drafts; streamlined props (removed `variant`). |
| `components/studios/StudiosLandingClient.tsx` | Removed hero-cluster **Build your private Studio** + **Start your studio** pills; added `.studios-hero-explore` row under paragraph for **Explore Gap U** + **See live pages**; CSS for desktop flex-start vs mobile centered links. |

`app/studios/page.tsx` and `app/globals.css` unchanged (no edits required).

## CTA hierarchy

1. **Top strip (authenticated only)** — “Create Studio” / “Continue draft” headline + two primary actions side by side on desktop, stacked ≤540px width.
2. **Hero column** — Headline → body copy → lightweight secondary links (**Explore Gap U** · **See live pages**).
3. **Featured playlist / video** — Unchanged (`FeaturedStudioPlaylist`).

Anonymous visitors: no top strip (uncharged); hero still exposes Gap U + live demos via the secondary links; **Start your studio** is no longer in the hero pile (marketing nav/site header may still expose studio entry elsewhere; benefit modal still links `/studios/start`).

## Routes

| Label | Destination | Notes |
|--------|-------------|--------|
| Build Studio | `/studios/create` or `/studios/create?draftId=…` via `studioBuilderHref()` | Matches wizard (`STUDIO_BUILDER_WIZARD_HREF`). |
| Start Studio | `/studios/start` | Canonical editor/start surface documented in codebase. |

Secondary: `/studios/gap-u`, `#studios-live` (existing anchor).

## Responsive behavior

- **Banner**: `.smcta-banner-inner` column layout & full-width buttons under **540px**; horizontal wrap otherwise.
- **Hero links**: `justify-content: center` by default; `flex-start` from **880px** to align with desktop left-aligned column.
- Wrapped flex row avoids horizontal overflow.

## Validation

- `npm run typecheck` — exit `0` (`tsc --noEmit`).
- `npx next build` — exit `0`; build log reports `Compiled successfully`.

## Commit

- **Branch:** `studios-agent-114-hero-cta-nav-cleanup` (tracked on `origin`)
- **Commits:** `6b490d3` (“Clean up Studios hero CTA hierarchy”) — implementation; `07fd790` — report touch-up listing hash above.
- **Branch tip:** `07fd790`

(`git add .` would have pulled in unrelated untracked admin/debug artifacts; staged only hero CTA + this report.)
