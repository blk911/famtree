# Agent 112 — Studios hero featured video + playlist stack

Branch: `studios-agent-112-featured-video-playlist`.

## 1. Files modified

| Change | Path |
|--------|------|
| Added | `components/studios/landing/FeaturedStudioPlaylist.tsx` |
| Removed | `components/studios/landing/FeaturedStudioVideoCarousel.tsx` |
| Updated | `components/studios/StudiosLandingClient.tsx` (playlist import, hero grid align/width, tighter section padding) |
| Updated | `lib/studios/landing/studioStackData.ts` (`playlistDescriptor` field; comment touch-up) |
| Unchanged routing | `app/studios/page.tsx` still mounts `StudiosLanding` |

## 2. Featured video behavior

- Default active item: **`private-client-network`**.
- Featured frame: **`16 / 9`**, capped at **`max-height ~198px` desktop (~186px mobile)** — shorter than Agent 111 to cut vertical slack.
- **Muted**, **`playsInline`**, **`controls`**, **`preload="metadata"`** — **no autoplay**.
- Decorative **glass play badge** overlays the frame (`pointer-events: none`; native controls still work).

## 3. Playlist behavior

- Rows are **compact horizontal stripes** (**~64–78px**) with **thumb + title + `playlistDescriptor`**.
- **`Watch next`** label separates featured shell from stacked queue (Netflix/Masterclass–style pacing).
- **Active** playlist row: tinted `accentSoft`, **3px left accent bar** (`border-left-color`), no phantom “floating giant card”.
- Row click swaps `activeId` → recomputes headline copy, CTAs, and `<video>` `key=` remount/pause/load.

CTA parity with Agent 111:

- **Gap U**: primary **Enter Gap U** (`/studios/gap-u`) + ghost **Studio preview …** modal.
- **Others**: primary **Studio preview** modal + contextual **Browse demos** (`#studios-live`) or **Visit live Space**.

## 4. Responsive behavior

- **Desktop:** Vertical playlist stack **directly beneath** unified featured shell.
- **Mobile / tablet (≤879px):** Playlist becomes **horizontal scroll** row (`scroll-snap`, thin scrollbar styling).

## 5. Whitespace / layout improvements

- Dropped detached **sidebar thumb rail**.
- Consolidated hero video + headline + CTAs into **single premium shell**.
- Landing hero uses **`align-items: flex-start`** on desktop + **`max-width: 472px`** on the visual column instead of cramped 420 + centered stretch.
- Slightly tightened hero **`section` padding** (vertical clamp trimmed) — **overall hero height not bloated**.

## 6. Validation results

- `npm run typecheck` — **exit 0**
- `npx next build` — **exit 0**

## 7. Commit hash

Primary feature commit: **`11b65d4`** (`Refactor Studios hero into featured video playlist layout`).

