# Agent 96 — Studio Source Intake Storage Report

**Branch:** `studios-agent-96-source-intake-storage`  
**Mission:** API + UI wiring for source links and draft persistence — no scraping, AI, or publish.

---

## API routes added

| Method | Path | Behavior |
|--------|------|----------|
| `POST` | `/api/studios/builder/drafts` | Create draft (`templateType`, optional `builderStep`) |
| `GET` | `/api/studios/builder/drafts/[draftId]` | Owner-scoped read + sources |
| `PATCH` | `/api/studios/builder/drafts/[draftId]` | Update step, status, template |
| `POST` | `/api/studios/builder/drafts/[draftId]/sources` | Add source row |
| `DELETE` | `/api/studios/builder/drafts/[draftId]/sources/[sourceId]` | Remove source |

All routes require `requireAuth()` and scope by `ownerUserId`.

---

## Source validation

Implemented in `lib/studios/builder/validateSourceUrl.ts` + `addStudioBuilderSource`:

- `manual` — URL optional
- Other types — HTTPS required, normalized
- Rejects localhost/private IPs, embedded credentials, obvious `/login` paths
- No credential fields in schema or API body

Zod: `addSourceBodySchema` in `lib/studios/builder/schemas.ts`.

---

## UI wiring

| Component | Change |
|-----------|--------|
| `StudioBuilderShell` | Loads `?draftId=`, creates/patches drafts, calls source APIs |
| `StudioSourcesStep` | Status messages (saved / invalid URL), remove via DELETE |
| `lib/studios/builder/clientApi.ts` | Browser fetch helpers |

**Flows:**

- Signed-in user: Next from step 1 creates draft; sources POST to DB; Save draft PATCHes step/template
- Guest: local source list + sign-in prompt on save

---

## Privacy constraints

- Public URLs only (server validation)
- Owner-only draft/source access
- No scraping or `extractedData` population (status stays `pending`)
- Published drafts reject new sources (`CONFLICT`)

---

## Files created / modified

**New:** `app/api/studios/builder/drafts/*`, `lib/studios/builder/schemas.ts`, `apiResponse.ts`, `clientApi.ts`, this report.

**Modified:** `StudioBuilderShell.tsx`, `StudioSourcesStep.tsx`.

**Schema:** unchanged (Agent 94).

---

## Validation results

| Command | Result |
|---------|--------|
| `npm run typecheck` | Pass |
| `npx next build` | Pass |

---

## Next

Agent 97 — AI draft generator stub; Agent 98 — review/edit screen.
