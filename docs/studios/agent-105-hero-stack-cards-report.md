# Agent 105 — Studios Hero Stack Cards Report

**Branch:** `studios-agent-105-hero-stack-cards`

## Files created

| Path | Purpose |
|------|---------|
| `components/studios/landing/StudioStackCards.tsx` | Layered 3-card stack + hover |
| `components/studios/landing/StudioPreviewModal.tsx` | Light/dark hybrid preview modal |
| `lib/studios/landing/studioStackData.ts` | Mock card data + future live placeholders |
| `public/uploads/studios/README.md` | Asset folder note |
| `docs/studios/agent-105-hero-stack-cards-report.md` | This report |

## Files modified

| Path | Change |
|------|--------|
| `components/studios/StudiosLandingClient.tsx` | Replaced `StudiosHeroVideo` with `StudioStackCards` |

## Removed

- Single black **Watch the film** hero block and fullscreen cinema opener

## Hover behavior

- Per-card `transform` lift + warm glow shadow on `:hover` / `:focus-visible`
- Respects `prefers-reduced-motion: reduce` (no transition)
- Front card lifts slightly more than back/middle

## Modal behavior

- Click card → `StudioPreviewModal`
- Video: `muted`, `controls`, no autoplay — user taps play for sound
- ESC + backdrop click close
- CTAs: Explore live Studio, Clone this Studio (`/studios/create?template=`), Build your own

## Mobile behavior

- Stack centered; card width `min(92%, 300px)` below 880px
- Modal single-column on narrow screens; two-column from 640px
- Hero grid unchanged (copy above stack on mobile)

## Future extensibility

`studioStackData.ts` includes optional:

- `liveActivityLabel`
- `memberCountLabel`
- `announcementPreview`

Wire to real Space activity when APIs exist.

## Validation

| Command | Result |
|---------|--------|
| `npm run typecheck` | Pass |
| `npx next build` | Pass |
