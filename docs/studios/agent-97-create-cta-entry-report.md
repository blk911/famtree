# Agent 97 — Create CTA + Builder Entry Report

**Branch:** `studios-agent-97-create-cta-entry`

## Files modified

| File | Change |
|------|--------|
| `app/studios/page.tsx` | Loads member draft for “Continue draft” |
| `components/studios/StudiosLandingClient.tsx` | Banner + hero CTAs for members |
| `components/studios/StudiosMemberCreateCta.tsx` | **New** CTA component |
| `lib/studios/builder/entry.ts` | **New** href helper |
| `lib/studios/getCurrentUserStudioHref.ts` | Sidebar → `/studios` when no owned slug |

## CTA locations

1. **Top banner** on `/studios` (logged-in only) — Create Studio / Continue draft
2. **Hero row** — “Build your private Studio” (logged-in only)
3. **Sidebar** — AIH Studios → `/studios` (landing with CTAs)

## Route target

`/studios/create` (`STUDIO_BUILDER_WIZARD_HREF`)

## Draft behavior

Server loads latest `draft` or `reviewed` draft → `?draftId=` on CTA href.

## Validation

| Command | Result |
|---------|--------|
| `npm run typecheck` | Pass |
| `npx next build` | Pass |
