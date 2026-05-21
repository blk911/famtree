# Agent 99 — Draft Review / Edit Report

## Files

| File | Role |
|------|------|
| `components/studios/builder/StudioDraftReviewStep.tsx` | Section editors + warnings |
| `components/studios/builder/StudioBuilderShell.tsx` | Edit + mark ready + save |

## Editable sections

- Identity name, hero headline/subcopy
- Benefits (body + visible toggle)
- How it works, invite message, request-access headline, first post
- Claims confirmation checkbox

## Save behavior

- Inline edits `PATCH` draft `content` on change
- **Save draft** button persists step + content
- **Mark ready to publish** → `status: reviewed`, `globalApproved: true`

## Warnings

`confidenceWarnings` rendered with severity styling; publish blocked until reviewed.

## Publish

Not implemented in this step — Agent 100.

## Validation

Pass
