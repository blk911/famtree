# Agent 101 — Request Access / Invite Flow Report

## Schema

`StudioAccessRequest` — `studio_access_requests` (pending | invited | declined)

## Files

| File | Role |
|------|------|
| `app/api/studios/[slug]/request-access/route.ts` | Public POST |
| `app/api/studios/builder/access-requests/route.ts` | Steward GET pending |
| `components/studios/PublishedStudioExtras.tsx` | Request modal + CTA |

## Request access behavior

- Name, email, note, optional relationship
- No open registration; no Studio auth
- Learning templates show guardian-aware copy
- Stored as `pending` for steward review

## Invite integration

Full `POST /api/invite` with `trustUnitId` is **manual next step** for steward (list API provided). No parallel invite tokens.

## Approval location

`GET /api/studios/builder/access-requests` — steward sees pending rows with studio slug/name.

## Validation

Pass
