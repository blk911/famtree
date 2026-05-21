# Agent 100 — Publish Studio to AIH Space Report

## Files

| File | Role |
|------|------|
| `lib/studios/builder/publishDraft.ts` | Publish orchestration |
| `lib/studios/builder/templateVaultMap.ts` | Template → vault type |
| `app/api/studios/builder/drafts/[draftId]/publish/route.ts` | POST publish |
| `lib/studios/loadPublishedStudioContent.ts` | Load published JSON |
| `lib/studios/loadStudioFromDb.ts` | Merge published content into provider |
| `components/studios/builder/StudioPublishStep.tsx` | Publish UI |

## Publish behavior

1. Validates `reviewed` or `globalApproved`
2. Idempotent if already `published` — returns existing studio slug
3. Creates `TrustUnit` + `AihTrustUnitMeta` for owner
4. Creates `Studio` row (unique slug)
5. Links draft: `linkedSpaceId`, `publishedStudioId`, `status: published`

## Space / TrustUnit

| Template | Vault type |
|----------|------------|
| private-studio-network | CUSTOM |
| private-client-network | BUSINESS |
| family-learning | FAMILY |
| executive-work | PRIVATE |
| local-community | CHURCH |
| gap-u-learning-lab | CLUB |

## Slug

From `identity.slugSuggestion` or slugified name; deduped with numeric suffix.

## Public page

`/studios/[slug]` renders `PublishedStudioExtras` when published draft exists.

## Validation

Pass
