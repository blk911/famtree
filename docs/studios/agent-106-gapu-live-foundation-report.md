# Agent 106 — Gap U Live Studio Foundation

**Branch:** `studios-agent-106-gapu-live-foundation`  
**Date:** 2026-05-19

## Mission

Create **Gap U** as the flagship LIVE Studio example: aspirational, grounded content for a real future-learning private Studio (homeschool + tutoring + invention lab). Not lorem, not a fake marketplace — invite-only trusted access.

## Routes created

| Route | File | Notes |
|-------|------|-------|
| `/studios/gap-u` | `app/studios/gap-u/page.tsx` | Dedicated published example; composes `GapUStudioPage` + `StudiosFooter` |
| `POST /api/studios/gap-u/request-access` | `app/api/studios/[slug]/request-access/route.ts` | Special-case when no DB `Studio` row (preview accepts request with steward message) |

**Resolver:** `lib/studios/resolveStudioPage.ts` returns Gap U provider for slug `gap-u` so shared slug tooling stays consistent.

## Sections added

### Hero
- Eyebrow, headline, dual subcopy
- Pillars: future learning, private community, human-guided learning, invention + tutoring + labs

### Why private learning spaces matter
- Focused communication, safe coordination, family alignment, no algorithmic feed chaos, direct parent–tutor connection

### Core sections (8 cards)
1. Learning Pods  
2. Catch-Up Labs  
3. Robotics & AI  
4. Parent Coordination  
5. Private Tutor Access  
6. Events & Workshops  
7. Resource Vault  
8. Announcements (section card; list below)

### Live-style lists
- **3 announcements** (realistic copy, audience tags)
- **3 events/workshops** (dates, locations, member/invite access)
- **4 resource vault cards** (guide, schedule, lab, policy)

## CTA behavior

| CTA | Location | Behavior |
|-----|----------|----------|
| **Explore Gap U** | Studios landing hero + `#studios-live` featured card | Links to `/studios/gap-u` |
| **Explore live Studio** | Family & Learning stack card modal | `exploreHref: /studios/gap-u` |
| **Request access** | Gap U page footer bar | Modal → `POST /api/studios/gap-u/request-access`; preview OK without DB row |
| **Open member Space** | Shown when `isMember` (future wire) | Links to `/aihsafe` |
| **Sign in** | Unauthenticated hint | `/login` |

No payment, marketplace, open forum, or public social feed UI.

## Future live-content structure

```
lib/studios/gapu/
  types.ts              # Stable shapes: GapUStudioLiveContent, sections, announcements, events, resources
  gapuStudioConfig.ts   # GAP_U_PROVIDER, GAP_U_LIVE_CONTENT (source: "mock" | "live")
  index.ts              # Public exports + getGapUStudioBundle()

components/studios/gapu/
  GapUStudioPage.tsx    # Renders content object (swap source, not layout)
  GapUAccessBar.tsx     # Access / request modal
```

**Swap path:** Replace `GAP_U_LIVE_CONTENT` with API/CMS payload matching `GapUStudioLiveContent`; set `source: "live"` and bump `version`. Page and components stay unchanged.

**DB path:** Seed or publish a `Studio` row with slug `gap-u` to persist `StudioAccessRequest` records via existing Prisma flow.

## Landing integration

- `StudiosLandingClient.tsx` — hero **Explore Gap U** button + flagship card in live pages grid  
- `lib/studios/landing/studioStackData.ts` — family-learning card `exploreHref` → `/studios/gap-u`

## Validation

Run on branch:

```bash
npm run typecheck
npx next build
```

| Check | Result |
|-------|--------|
| `npm run typecheck` | Pass |
| `npx next build` | Pass (exit 0) |

## Files touched (summary)

- `lib/studios/gapu/*` (new)
- `components/studios/gapu/*` (new)
- `app/studios/gap-u/page.tsx` (new)
- `lib/studios/resolveStudioPage.ts`
- `app/api/studios/[slug]/request-access/route.ts`
- `components/studios/StudiosLandingClient.tsx`
- `lib/studios/landing/studioStackData.ts`
- `docs/studios/agent-106-gapu-live-foundation-report.md`

## Out of scope (per mission)

- Real payments / course marketplace  
- Open forums / public algorithmic feeds
