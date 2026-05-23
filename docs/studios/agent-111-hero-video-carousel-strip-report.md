# Agent 111 — Studios hero video carousel strip

Branch: `studios-agent-111-hero-video-carousel-strip`.

## Summary

The tilted/overlapping `StudioStackCards` deck was replaced with a **video-forward carousel**: one **active** card with a large `16:10` media frame (capped height) and **four compact vertical thumbnails** (horizontal scroll on small screens). Default selection is **Private Client Network**. Thumbnail click swaps the active clip and copy; primary CTA opens **Studio preview** (existing modal) except **Gap U**, where the live CTA is primary to `/studios/gap-u`.

## Files modified / removed / added

| Action | Path |
|--------|------|
| Add | `components/studios/landing/FeaturedStudioVideoCarousel.tsx` |
| Remove | `components/studios/landing/StudioStackCards.tsx` |
| Update | `components/studios/StudiosLandingClient.tsx` (hero imports + render) |
| Update | `lib/studios/landing/studioStackData.ts` (4 cards ordered, Gap U entry,Carousel export) |
| No change needed | `app/studios/page.tsx` — still renders `StudiosLanding` |
| Minimal | `components/studios/landing/StudioPreviewModal.tsx` unchanged (consumes updated card typing) |

## Carousel behavior

- **DEFAULT_ACTIVE_ID**: `private-client-network`.
- **Data source**: `FEATURED_STUDIO_VIDEO_CARDS` in `studioStackData.ts` (canonical order Private → Executive → Family → Gap U).
- **Legacy alias**: `STUDIO_STACK_CARDS` equals the same array for older imports.

## Active video behavior

- Active pane shows **`muted`** `<video>` with **`preload="metadata"`**, **`controls`**, **`playsInline`** — **no autoplay** (user must tap play on the native control strip for motion/sound compliance).
- Soft poster tint behind the `<video>` for contrast on dark letterboxing.
- `max-height: 260px` desktop (`220px` mobile) keeps the hero from growing excessively.

## Thumbnail strip behavior

- **Desktop / tablet (&gt;879px):** vertical column (~86px wide) to the **right** of the active stage; `role="tablist"` semantics.
- **Mobile (≤879px):** thumbnails **below** the active stage, **row + horizontal scroll** + `scroll-snap`.
- **Selected** thumb: `box-shadow: 0 0 0 2px {accent}` (no giant ring offset).
- **Hover:** slight lift on thumbs and primary buttons (disabled under `prefers-reduced-motion`).

## Gap U link behavior

- Card `id: "gap-u"` has `preferLiveHeroCta: true` and `exploreHref: "/studios/gap-u"`.
- **Primary** CTA: **Enter Gap U** (styled live/pink).
- **Secondary:** **Studio preview …** opens the same `StudioPreviewModal` as other examples.

Other cards use **Studio preview** (solid) plus **Browse demos** (`#studios-live`) or **Visit live Space** where applicable.

## Responsive behavior

- Hero grid in `StudiosLandingClient.tsx` unchanged: two-column desktop, single-column mobile.
- Carousel uses `flex-row` desktop, `flex-column` mobile so the **large card stacks above** the scrolling thumb row.

## Validation

Ran from `C:\\dev\\famtree`:

```bash
npm run typecheck
```

**Result:** exited `0`.

```bash
npx next build
```

**Result:** exited `0` (completed route compilation without errors).

