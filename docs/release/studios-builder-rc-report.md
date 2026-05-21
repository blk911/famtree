# Studios Builder — Release Candidate Report

**Branch:** `studios-agent-97-create-cta-entry` (Agents 97–104 stacked)  
**Target:** v2.0 preview deploy — **not** production merge until preview QA

## Merge readiness

| Area | Status |
|------|--------|
| Typecheck | Pass |
| Production build | Pass |
| DB schema | `studio_builder_drafts`, `studio_builder_sources`, `studio_access_requests` |
| Main branch | Untouched — work on feature branch |

## Blockers

- None for preview deploy
- Steward invite-from-request UI is manual follow-up

## Preview URL next step

Deploy branch to Vercel preview → test `/studios`, `/studios/create`, publish flow, `/studios/[slug]`.

## Scope delivered

Entry CTAs → wizard → sources → AI stub draft → edit → publish → public page → request access → member Space link.
