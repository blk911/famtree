# Agent 103 — Studio Builder QA / Security Report

## Flows tested (code review + build)

| # | Flow | Status |
|---|------|--------|
| 1 | Create Studio from CTA | `/studios` banner + hero → `/studios/create` |
| 2 | Choose each template | Six cards in `StudioTemplateStep` |
| 3 | Add source links | Validated HTTPS; no credentials |
| 4 | Generate draft | Stub generator; AI label shown |
| 5 | Edit draft | `StudioDraftReviewStep` |
| 6 | Save and resume | `?draftId=` + PATCH |
| 7 | Publish | TrustUnit + Studio + idempotent |
| 8 | Public page | `PublishedStudioExtras` when published |
| 9 | Request access | POST creates `StudioAccessRequest` |
| 10 | Member Space link | TrustUnit membership check |
| 11 | Unauthorized private | No bypass; invite-only copy |
| 12 | Learning template | Guardian copy on request |
| 13 | Executive template | No family language in generator |

## Security findings

| Check | Result |
|-------|--------|
| No credential capture | Pass — URL validation only |
| No private scraping | Pass |
| No separate Studio auth | Pass |
| Publish requires review | Pass |

## Bugs fixed this pass

- Hydration fix in `AIHChatBot` (ellipsis in `<style>`)
- `PublishedStudioExtras` props/type alignment
- Publish idempotency + reviewed gate

## Remaining gaps

- Steward “approve request → send invite” one-click not wired
- No LLM extraction (by design)
- Mock slug pages unchanged when no published draft
- `prisma generate` EPERM on Windows when dev server locks DLL

## Readiness

**Preview-ready** on branch `studios-agent-97-create-cta-entry` for internal QA. Not production-merge until preview deploy validated.

## Validation

`npm run typecheck` — Pass · `npx next build` — Pass
