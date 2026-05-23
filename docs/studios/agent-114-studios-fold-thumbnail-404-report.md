# Agent 114 — Studios hero fold thumbnails & poster 404 repair

## Symptom

On `/studios`, the featured playlist rail showed **working thumbnails only for Family & Learning**; Private Client Network, Executive, and Gap U showed **blank thumb slots**. The **center “video preview” slot** stayed **dark / spinner** when those cards were active.

## Root cause

`FEATURED_STUDIO_VIDEO_CARDS` in `lib/studios/landing/studioStackData.ts` pointed three `foldImageUrl` values at Unsplash CDN paths that **`HEAD`/`GET` resolve as HTTP 404** (photo removed or ID invalid upstream). Only the Family card’s URL responded **200**, matching the lone working rail thumbnail.

Secondary issue: playlist thumbs used **`background-image: url(...)`** on empty spans — fine when the URL is valid, opaque when not. The hero `<video poster={foldImageUrl}>` used the **same URLs**, so broken posters compounded the empty preview.

Verification (example):

```text
FAIL https://images.unsplash.com/photo-1560066984-138d983ef2e8?auto=format&fit=crop&w=800&q=75  → 404
200 .../photo-1522202176988-66273c2fd55f?...
```

## Fix

1. **Data** — Replaced failing `foldImageUrl` strings with **Unsplash URLs confirmed 200**, keeping thematic fit:
   - Private Client Network → fitness / training floor image
   - Executive Strategy Space → collaborative workspace image
   - Gap U → cohort / laptop learning image  
   Family & Learning **unchanged** (already valid).

2. **UI resilience** (`FeaturedStudioPlaylist.tsx`):
   - **Rail** — Switched thumbnails to `<img src={foldImageUrl}>` (lazy + async decode) plus neutral background if load is slow/fails.
   - **Hero `<video>`** — `onError` sets state to **`heroVideoBroken`**, resetting per `activeId`. On error, hide the `<video>` and show the **static poster pane** (`posterOnlyStyle`) so missing `/uploads/*.mp4` on a host doesn’t trap users on a perpetual loading/black state.

## Follow-up (deploy)

`/uploads` hero MP4s are **whitelisted** in `.gitignore` and may be omitted from some clones; confirm `Private_Studio_Network_*.mp4` exist on production so **actual** clip playback works—not only posters.
