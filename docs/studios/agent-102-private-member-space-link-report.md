# Agent 102 — Private Member Space Link Report

## Files

| File | Role |
|------|------|
| `lib/studios/studioMemberAccess.ts` | Owner + TrustUnit membership check |
| `components/studios/PublishedStudioExtras.tsx` | Member vs request CTAs |
| `app/studios/[slug]/page.tsx` | Pass access into extras |

## Member detection

- Owner → member
- `TrustUnitMember` on `linkedSpaceId` → member

## Member CTA

**Open member Space** → `/aihsafe?space={trustUnitId}`

## Non-member

**Request access** modal (invite-only copy)

## Unauthorized

No private Msg Vault route from public page; member Space requires AIH session + membership.

## Validation

Pass
