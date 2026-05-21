# Agent 95 — Studio Builder Wizard Shell Report

**Branch:** `studios-agent-95-builder-wizard-shell`  
**Mission:** First wizard UI shell — no AI, scraping, publishing, or schema changes.

---

## Files created

| Path | Purpose |
|------|---------|
| `app/studios/create/page.tsx` | Wizard route |
| `components/studios/builder/StudioBuilderShell.tsx` | Stepper, next/back, save placeholder |
| `components/studios/builder/StudioTemplateStep.tsx` | Six template cards |
| `components/studios/builder/StudioSourcesStep.tsx` | Source link form (local state) |
| `components/studios/builder/StudioDraftPreviewStep.tsx` | AI draft placeholder |
| `components/studios/builder/StudioPublishStep.tsx` | Publish placeholder (no fake publish) |
| `docs/studios/agent-95-builder-wizard-shell-report.md` | This report |

## Files modified

| Path | Change |
|------|--------|
| `lib/studios/publishedSpaceBridge.ts` | `STUDIO_BUILDER_WIZARD_HREF` |
| `components/studios/StudiosSpacesPoweredNote.tsx` | Link to builder + classic editor |

---

## Route added

- **`/studios/create`** — public Studios layout; optional `?draftId=` for Agent 96 hydration

`/studios/start` unchanged (classic `StudioEditor`).

---

## Wizard steps

| Step | Component | Behavior |
|------|-----------|----------|
| 1 | `StudioTemplateStep` | Six templates from `STUDIO_BUILDER_TEMPLATES` |
| 2 | `StudioSourcesStep` | Add/remove links (local until Agent 96) |
| 3 | `StudioDraftPreviewStep` | Placeholder summary |
| 4 | `StudioPublishStep` | “Coming soon” — no publish action |

---

## Templates shown

All six Agent 94 gallery entries: Private Studio Network, Private Client Network, Family & Learning Space, Executive Strategy Space, Local Community / Church / PTA, Gap U / Learning Lab.

---

## Validation results

| Command | Result |
|---------|--------|
| `npm run typecheck` | Pass |
| `npx next build` | Pass — `/studios/create` dynamic route |

---

## Next

Agent 96 — API routes + wire `StudioSourcesStep` and save draft to Prisma.
