# Agent 110 — Gap U directional redesign & ZIP audit

Branch: `studios-agent-110-gapu-directional-redesign`.

## ZIP inspection (`project (1).zip`)

- **Unpack location (local sandbox):** expanded under `%TEMP%\\famtree-gapu-zip-audit-*`. No archive contents were imported into `/public` bundles.
- **Framework:** standalone Vite + React + Tailwind/Shadcn monolith with Express backend, Drizzle ORM (`package.json`, `vite.config.ts`, `drizzle.config.ts`). Replit scaffolding (`.replit`, `.cache/replit`).
- **High-signal instructional IP:** `client/src/components/Curriculum.tsx` — multi-phase narrative (Discover You → What's Next → Execute → Obstacle lens) with richly authored weekly prompts/bullets. This is curriculum copy worth preserving as **structured data**, not UI.
- **Calendar / coursework:** `client/src/components/Schedule.tsx` intentionally returns `null` — **no machine-readable timetable** surfaced in-repo.
- **Intentionally discarded from port:** Stripe/payment dashboards (`BENCHMARK_2025-05-24.md` references), Wouter SPA routing, Drizzle registrations schema, TanStack-heavy admin flows. None of those were fused into `/studios` routing.
- **Styling baseline to avoid cloning:** cramped tab strip + purple utility soup + inline card density from Curriculum UI. Famtree Gap U prefers the existing blush/stone flagship surface already used by `GAP_U_SURFACE_CSS`.
- **Worth copying forward:** thematic phases, journaling prompts distilled into summaries, obstacle/“solve for X” framing, execution lenses (discovery, MVP, differentiation, economics, loops) as learning outcomes — surfaced now in `lib/studios/gapu/gapuRoadmapData.ts`.

## Product changes (Famtree Gap U flagship)

### Layout pillars

| Section | Notes |
| --- | --- |
| Hero | Matches mission copy verbatim + AIH eyebrow cue. |
| Three pathway cards | Family-led pods, Business tracks, Gap U pillar with CTAs to **pages**. |
| Why private matters | Existing steward rationale retained. |
| Roadmap preview | Pulls live data from roadmap module; trims to early phases then links onward. |
| Live Studio heartbeat | Announcements/events/resources remain as illustrative mock payloads. |
| Access | `GapUAccessBar` emphasizes **Live Studio**, keeps **modal only for request-access** + login hint. |

### New routes (`app/studios/gap-u/*`)

| Path | Purpose |
| --- | --- |
| `/studios/gap-u/family-led-learning` | Deep content for Pillar 1 + cross-links |
| `/studios/gap-u/business-tracks` | Pillar 2 narrative (explicitly bans payments here) |
| `/studios/gap-u/program` | Pillar 3 narrative tying to archival curriculum |
| `/studios/gap-u/roadmap` | Reads `GAP_U_ROADMAP` end-to-end |

### Config + types

- `GAP_U_LIVE_CONTENT` bumped to **v2**, adds `pathways`, `roadmapPreview`, sheds unused `sections` grid.
- `lib/studios/gapu/gapuSurfaceCss.ts` centralizes typography/cards/access chrome for parity between flagship + satellites.
- `lib/studios/gapu/gapuRoadmapData.ts` is the sanitized JSON-like module derived from archival curriculum prose.

### Files touched

- `components/studios/gapu/GapUStudioPage.tsx`
- `components/studios/gapu/GapUAccessBar.tsx`
- `components/studios/gapu/GapUSubpageChrome.tsx` (**new**)
- `lib/studios/gapu/types.ts`
- `lib/studios/gapu/index.ts`
- `lib/studios/gapu/gapuStudioConfig.ts`
- `lib/studios/gapu/gapuSurfaceCss.ts` (**new**)
- `lib/studios/gapu/gapuRoadmapData.ts` (**new**)
- `app/studios/gap-u/roadmap/page.tsx` (**new**)
- `app/studios/gap-u/family-led-learning/page.tsx` (**new**)
- `app/studios/gap-u/business-tracks/page.tsx` (**new**)
- `app/studios/gap-u/program/page.tsx` (**new**)
- This report under `docs/studios/agent-110-gapu-redesign-zip-audit-report.md`

## Remaining gaps

1. **CMS / stewardship wiring:** roadmap + pillars still live in TS modules (`GAP_U_ROADMAP`, `GAP_U_LIVE_CONTENT`); admins cannot edit via UI yet.
2. **Calendar ingestion:** archival schedule stub means Famtree cannot auto-populate ICS-style rhythm without authoring new data contracts.
3. **Member-only divergence:** heartbeat lists remain mock placeholders until bound to Postgres/API sources with proper auth gating.

## Validation

Ran from `C:\dev\famtree` on Agent 110 wrap-up:

```bash
npm run typecheck
```

- **Result:** exited `0`.

```bash
npx next build
```

- **Result:** exited `0`. Next enumerated new routes `/studios/gap-u/{family-led-learning,business-tracks,program,roadmap}` in the route manifest.
