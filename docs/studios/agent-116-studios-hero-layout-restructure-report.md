# Agent 116 — AIH Studios landing hero layout restructure

## Summary

Collapsed the fragmented hero into a single flow: **ribbon → two-column storytelling + featured video → compact horizontal studio examples → Live studio pages**. Removed the four “Why studios” narrative cards and their modal.

## Files changed

| Path | Change |
|------|--------|
| `components/studios/landing/StudiosHeroFeaturedStudios.tsx` | **New** — owns featured-video card + synced horizontal example picker (formerly side rail inside `FeaturedStudioPlaylist`). |
| `components/studios/landing/FeaturedStudioPlaylist.tsx` | **Removed** (replaced by `StudiosHeroFeaturedStudios.tsx`). |
| `components/studios/StudiosLandingClient.tsx` | Ribbon headline; wraps copy as `children` of featured component; deletes benefits grid + `BenefitModal` + related state/CSS; trims section spacing; fixes `mockStudios` import to `@/lib/studios/mockStudios`. |

## Sections removed

- Entire **“Why studios”** block: eyebrow, *Empowering personal connections…* as a sectional H2, tap-a-card subtitle, and the four benefit buttons (*Human contact…*, *Relationships…*, *You approve…*, *Counterweight…*).
- **`BenefitModal`** and **`BENEFITS`** definitions (Lucide-driven copy).

Previously floating section title is repurposed only as the **thin hero ribbon** (updated string below).

## Where demo cards moved

The four playlist entries (Private Client Network, Executive Strategy Space, Family & Learning Space, Gap U) moved from the **right vertical rail** to a **`Studio examples`** row **directly under** the main two-column hero. Layout:

- Desktop: **4-column grid** of compact horizontal cards (thumb left, title + descriptor right).
- ≤900px: **2-column** grid.
- ≤520px: **horizontal scroll** row (`scroll-snap`, thin scrollbar).

Selection still swaps the hero video/metadata and preserves **StudioPreviewModal**.

## Responsive order (mobile)

DOM order matches spec:

1. Ribbon  
2. Hero copy (badge, headline, body, Gap U / live links)  
3. Featured video card  
4. Horizontal studio examples  
5. **Live studio pages** (then testimonials)

## Ribbon copy

Rendered as premium strip (gold-tint border-bottom, restrained type):

**Empowering personal connections in an automated world.**

## Validation

- `npm run typecheck` — **pass**
- `npx next build` — **pass** (`Compiled successfully` in log)

## Commit / push

_(Record hash after committing on your branch.)_
