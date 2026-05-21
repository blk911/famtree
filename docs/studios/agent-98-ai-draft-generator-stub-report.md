# Agent 98 — AI Draft Generator Stub Report

**Branch:** `studios-agent-97-create-cta-entry` (stacked with 97–104)

## Files

| File | Role |
|------|------|
| `lib/studios/builder/generateDraft.ts` | Mock generator from template + sources |
| `lib/studios/builder/generateDraftForOwner.ts` | Persist to draft row |
| `app/api/studios/builder/drafts/[draftId]/generate/route.ts` | POST generate |
| `components/studios/builder/StudioDraftPreviewStep.tsx` | Generate / regenerate button |
| `components/studios/builder/StudioBuilderShell.tsx` | Wire generate + content state |

## Draft generator behavior

- Inputs: `templateType`, `sources[]`, optional steward name
- No scraping, no paid API, no credentials
- Sets `generatedBy: "ai_stub"`, `aiDraftLabel: "AI draft — review before publish"`
- Emits `confidenceWarnings` when no sources or social links present

## Templates supported

All six `StudioTemplateType` values with tone/section variants (executive, learning, client, etc.).

## Storage

`PATCH` content JSON on `studio_builder_drafts` via `generateDraftForOwner`; bumps `version`.

## Validation

`npm run typecheck` — Pass · `npx next build` — Pass
