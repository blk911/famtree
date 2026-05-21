# Agent 90 — Studios “White-Label Community OS” Positioning Report

**Branch:** `studios-agent-90-community-os-positioning`  
**Mission:** Finalize the hero triad as three consistent lenses on one **trusted private community operating system** — not three disconnected promo cards.

---

## 1. Files modified

| File | Change |
|------|--------|
| `lib/studios/communityOsHeroCopy.ts` | **New** — triad titles, subcopy, benefits, video/fold config |
| `components/studios/trainer/StudioHeroPlatformCard.tsx` | **New** — shared card layout |
| `components/studios/trainer/StudioHeroTriad.tsx` | **New** — 3-column (or 2-column edit) grid |
| `components/studios/trainer/ApplyStudioHero.tsx` | Preview triad + edit contact / platform cards |
| `components/studios/trainer/StudioHeroVideoSlot.tsx` | `fitParentWidth` for equal media sizing |
| `app/globals.css` | *(Agent 90 custom rules removed — caused layout/CSS issues; triad uses Tailwind only)* |

**Preserved:** routing, auth, publish/preview controls, hero contact edit flow (left column), `StudioHeroIntroColumn` / `StudioCommunityIdentityBlock` (unused in hero but kept for other paths).

---

## 2. Card-by-card positioning

| Card | Title | Theme | Audience |
|------|-------|-------|----------|
| 1 | **Private Studio Network** | Invite-only private community | Coaches, trainers, clubs, creators, membership groups |
| 2 | **Private Client Network** | Relationship-driven business communities | Salons, wellness, stylists, medspa, personal care |
| 3 | **Family & Learning Spaces** | Safe structured communication | Families, PTA, church, homeschool, youth, parents |

Each card shares: lens eyebrow → video → title → subcopy → benefit bullets.

---

## 3. Removed directory/contact elements

From **preview/published** hero (no longer shown):

- Email, phone, address rows
- MapPin / Mail / Phone contact block
- Directory-style “listing” identity block
- Per-column mismatched story bullets

**Edit mode** still collects and confirms contact fields in the left column (publish flow unchanged). Preview shows optional `Your community · {studio name}` on card 1 only — not a contact directory.

---

## 4. Consistency fixes

- Single component (`StudioHeroPlatformCard`) drives all columns.
- Shared typography: 10px lens eyebrow, 1.35–1.5rem title, 15px subcopy, 14px benefits.
- `StudioHeroTriad` grid with equal column padding and `md:items-stretch`.
- Preview badge: “Studio preview” / “Published studio” (not “listing”).

---

## 5. Video positioning updates

| Card | Clip | Overlay tone |
|------|------|----------------|
| Private Studio Network | `Studios_Relationship-Based_Business_720p_caption.mp4` | Invite-only members · trusted spaces |
| Private Client Network | `Testimony 2.mp4` | Trusted client space · real relationships |
| Family & Learning Spaces | `studio_3.mp4` | Safe group communication · human-first |

Avoids influencer / creator-economy language; reinforces trust, communication, belonging.

---

## 6. Typography/spacing alignment

- Tailwind utilities on triad grid (`w-full`, `md:grid-cols-3`, `md:items-stretch`) — no custom globals.
- Edit mode uses flat `35% / 32.5% / 32.5%` grid (contact + two platform cards), not a nested 2-col triad.
- Video slots use `fitParentWidth` so media spans column width consistently.

---

## 7. Remaining polish opportunities

- Per-card MP4s shot specifically for each lens (currently reuses existing uploads).
- Optional: surface `provider.bio` as a one-line custom subcopy on card 1 in preview only.
- Studios marketing landing (`StudiosLandingClient.tsx`) still has legacy trainer copy — out of scope for this pass.
- Re-enable intro-story draft editor if creators need custom bullets on a specific card.

---

## 8. Validation results

| Command | Result |
|---------|--------|
| `npm run typecheck` | **Pass** (exit 0) |
| `npx next build` | **Pass** (exit 0, ~23s) |

---

*Agent 90 — white-label trusted community OS hero triad.*
