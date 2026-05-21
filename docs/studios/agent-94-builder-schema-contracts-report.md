# Agent 94 — Studio Builder Schema / Contracts Report

**Branch:** `studios-agent-94-builder-schema-contracts`  
**Mission:** Schema, types, and service contracts only — no wizard UI, AI, or scraping.

---

## Files created

| Path | Purpose |
|------|---------|
| `types/studios/builder.ts` | DTOs, enums, `StudioDraftContentDTO` JSON shape |
| `lib/studios/builder/index.ts` | Service exports + Prisma CRUD stubs |
| `lib/studios/builder/templates.ts` | Six template gallery metadata |
| `lib/studios/builder/defaultDrafts.ts` | Default `content` JSON per template |
| `lib/studios/builder/mappers.ts` | DB row → DTO mapping |
| `lib/studios/builder/validateSourceUrl.ts` | Public URL validation (no credentials) |
| `docs/studios/agent-94-builder-schema-contracts-report.md` | This report |

## Schema additions (`prisma/schema.prisma`)

### `StudioBuilderDraft` → `studio_builder_drafts`

| Column | Type | Notes |
|--------|------|-------|
| `id` | cuid | PK |
| `ownerUserId` | FK → `User` | Steward |
| `templateType` | String | Gallery id |
| `status` | String | `draft` \| `reviewed` \| `published` |
| `builderStep` | String | Wizard step id |
| `content` | Json | Full `StudioDraftContentDTO` |
| `version` | Int | Bumps on content patch |
| `linkedSpaceId` | String? | Future Space FK |
| `publishedStudioId` | String? @unique | Optional link to `Studio` |

### `StudioBuilderSource` → `studio_builder_sources`

| Column | Type | Notes |
|--------|------|-------|
| `draftId` | FK → draft | Cascade delete |
| `sourceType` | String | instagram, website, … manual |
| `url` | String? | Normalized https |
| `label`, `userNotes` | optional | User input |
| `status` | String | pending, extracting, … |
| `extractedAt`, `extractionConfidence`, `extractedData` | optional | For Agent 97+ |

`User.studioBuilderDrafts` and `Studio.publishedFromDraft` relations added.

---

## Types added (`types/studios/builder.ts`)

- `StudioTemplateType`, `StudioSourceType`, `StudioSourceStatus`
- `StudioDraftStatus`, `StudioBuilderStep`
- `StudioSourceInputDTO`, `CreateStudioSourceInputDTO`
- `StudioDraftContentDTO`, `StudioDraftDTO`, `PatchStudioDraftDTO`
- `StudioDraftConfidenceWarning`, `StudioDraftSection`

---

## Service contracts (`lib/studios/builder/index.ts`)

| Function | Behavior |
|----------|----------|
| `createStudioBuilderDraft` | New row + default `content` JSON |
| `getStudioBuilderDraftForOwner` | Owner-scoped read |
| `patchStudioBuilderDraft` | Update step/status/content; blocks if published |
| `addStudioBuilderSource` | Validates URL, creates source row |
| `removeStudioBuilderSource` | Owner-scoped delete |
| `listStudioBuilderDraftsForOwner` | List for dashboard/API |
| `validateStudioSourceUrl` | Public URL rules |

---

## Validation results

| Command | Result |
|---------|--------|
| `npm run db:push` | Pass — tables `studio_builder_drafts`, `studio_builder_sources` synced |
| `npm run db:generate` | EPERM on Windows (dev server lock); `tsc` + `next build` still pass |
| `npm run typecheck` | Pass |
| `npx next build` | Pass |

---

## Next

Agent 95 — wizard shell on `/studios/create` using these contracts (client state + optional draft id in query).
