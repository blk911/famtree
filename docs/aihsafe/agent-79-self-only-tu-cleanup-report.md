# Agent 79 — Self-only Trust Unit display cleanup

**Branch:** `aihsafe-agent-79-self-only-tu-cleanup`  
**Date:** 2026-05-19

## Problem

Users with no real network could see multiple “Trust Unit Active” / “Trust circles” entries that contained only themselves. That inflated counts and implied active social circles.

## Approach (UI-only)

- No Prisma/schema changes, no deletes, no API changes.
- Shared helpers in `lib/trust/display.ts` classify units by **active member** ids (respects `exitedAt` on AIH Safe DTOs; tree loader has no exits).
- **Active circle:** 2+ active members, or 1 active member who is not only the viewer in a multi-member sense → implemented as `!isSelfOnlyTrustUnit` where self-only = exactly one active member and it is `currentUserId`.
- **Draft:** self-only units; multiple drafts collapse to one banner / count (no duplicate cards).

## Shared helpers

| Function | Purpose |
|----------|---------|
| `isSelfOnlyTrustUnit` | Single active member = current user |
| `getActiveTrustUnits` | Active trust circles for lists/counts |
| `getDraftTrustUnits` | All self-only units (for counts) |
| `partitionTrustUnits` | `{ active, drafts, draftCount }` |
| `TRUST_CIRCLES_EMPTY_*` | Standard empty copy |

## Surfaces fixed

| Surface | Behavior |
|---------|----------|
| My Network (`/tree`) main | `TrustCirclesPageSection` — active cards only; one draft banner; empty copy |
| My Network rail | `NetworkRailProfile` + `ContextRailTrustCirclesSection` |
| Dashboard rail | `DashboardRailProfile` — active only; empty state when none |
| Family Safe rail | `FamilySafeContextLayout` — members from active TUs only; `spaceCount` via `mySpaces` |
| Family Safe Spaces tab | `SpacesTab` — active trusted spaces; draft note; child circles exclude self-only |
| Family Safe overview cards | `RelationshipVisibilityCard`, `SpacesSnapshot`, `RelationalDashboard` hero count |

**Unchanged (intentional):** Dashboard private-thread / Msg Vault TU threading still receives full `trustUnits` from the server so setup threads keep working.

## Validation

| Check | Result |
|-------|--------|
| `npm run typecheck` | (run on branch) |
| `npx next build` | (run on branch) |

## Remaining gaps

- `StatusDashboard` trust-unit tile still counts all API items (needs `currentUserId` to filter).
- `InvitePanel` space dropdown still lists draft self-only spaces (valid for finishing setup).
- Tree `getTrustUnits` query does not expose `exitedAt`; all DB members count as active until AIH/tree loaders align.
