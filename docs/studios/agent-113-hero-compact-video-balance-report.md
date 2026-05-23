# Agent 113 — Studios hero compact video balance

Branch: `studios-agent-113-hero-compact-video-balance`.

## 1. Files modified

- `components/studios/landing/FeaturedStudioPlaylist.tsx` — center/rail split via `display: contents`, compressed playlist rows, tighter featured meta/video frame.
- `components/studios/StudiosLandingClient.tsx` — 3-column hero grid, narrowed pitch typography/CTAs, removed extra stack wrapper, lighter section padding.

**Note:** `app/studios/page.tsx` unchanged (route still renders `StudiosLanding`). No `globals.css` edits.

## 2. Layout proportions (desktop ≥880px)

CSS grid tracks: **`minmax(0, 36%) | minmax(0, 42%) | minmax(0, 22%)`** (inside `max-width: min(1180px,100%)`). `FeaturedStudioPlaylist` contributes two sibling cells (`fsp-center`, `fsp-rail`) through a **`display: contents`** bridge aligned with pitch column.

## 3. Left copy condensation

- Headline **`clamp(24–38px)`**, tighter **`line-height`** and tracking.
- Body copy smaller clamp, **`40ch`** max width desktop, tightened vertical rhythm CTAs (**`gap: 8px`**, **`9×16`** pill paddings **`13px`** type).

## 4. Featured video sizing

- **`aspect-ratio 16 / 9`**, **`max-height ~236px`** desktop (**~200px** mobile) larger reading width than prior rail layout but keeps vertical hero compact beneath fold.
- `object-fit: cover` retains clean crop under controls.

## 5. Playlist compression

Rows ~**50–56px**, thumbs **72×40** (**68×38** mobile strip), typography **12/10px**, **4px** stack gap, understated borders vs heavy card chrome. Label **`Up next`**.

## 6. Responsive

Single column stacking order: pitch → centered video/meta → horizontally scrolling playlist (**≤879px**) identical interaction model.

## 7. Validation

- `npm run typecheck` — exit **0**
- `npx next build` — exit **0**

## 8. Commit hash

*TBD immediately after git commit --trailer "Co-authored-by: Cursor <cursoragent@cursor.com>".*

