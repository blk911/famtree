# Agent 73 — Invite Intent Routing Foundation Report

**Branch:** `aihsafe-agent-73-invite-intent-routing`  
**Date:** 2026-05-19  
**Scope:** Foundational invite-intent routing (schema, service, API, registration materialization, minimal invite UI). Not full polished onboarding.

---

## Summary

Invites now carry **intent metadata** and route through `routeInviteByIntent()`. Registration calls `materializeInviteOutcome()` so child/teen invites create **guardian links + family unit membership + conservative policy defaults** without promoting anyone to site `founder`.

---

## Fields / types added

### Prisma (`Invite`)

| Field | Type | Purpose |
|-------|------|---------|
| `inviteIntent` | `String?` | `adult_friend`, `family_adult`, `child`, `teen`, `trusted_adult`, `business_member`, `business_admin` |
| `relationshipKind` | `String?` | Normalized edge (`sponsor`, `family_minor`, `business`, …) |
| `inviteeAgeBracket` | `String?` | `child`, `teen`, `adult`, `unknown` |
| `stewardDeclaration` | `Boolean` | Inviter attests parent/guardian/steward for minors |
| `sponsorUserId` | `String?` | Sponsor (defaults to sender) |
| `stewardUserId` | `String?` | Declared steward for child/teen |
| `targetTrustUnitId` | `String?` | Business / workspace scope |
| `targetFamilyUnitId` | `String?` | Family unit scope |

### TypeScript

- `types/aihsafe/invite-intent.ts` — intents, brackets, helpers
- `lib/aihsafe/invites/routeByIntent.ts` — create-time validation + routing
- `lib/aihsafe/invites/materializeInviteOutcome.ts` — post-register side effects
- `lib/aihsafe/invites/validateRegisterInvite.ts` — DOB + minor checks
- `lib/aihsafe/invites/invite-fields.ts` — field builders

---

## Routes changed

| Route | Change |
|-------|--------|
| `POST /api/invite` | Accepts `inviteIntent`, `inviteeAgeBracket`, `stewardDeclaration`, targets; uses `routeInviteByIntent`; skips auto-TU for child/business |
| `POST /api/aihsafe/invites` | Persists intent on invite; uses `routeInviteByIntent`; stores intent in approval `contextJson` |
| `GET /api/invite/[token]?forRegister=1` | Returns `requiresDateOfBirth`, `isMinorInvite`, `inviteIntent` for register UI |
| `POST /api/auth/register` | Validates invite vs DOB; `materializeInviteOutcome`; business skips sponsor bond |
| `executeDeferredAction` `invite_member` | Uses `routeInviteByIntent` with context intent fields |

---

## Routing outcomes

| Intent | On send | On register |
|--------|---------|-------------|
| `adult_friend` | Sponsor fields; optional auto trust-unit proposal | `invitedById` + sponsor bond only |
| `family_adult` | Same + optional `targetFamilyUnitId` | Bond + optional family unit member (`adult` role) |
| `child` / `teen` | Requires `stewardDeclaration`; no auto-TU | Guardian link (`parent`, approver), family unit, conservative policy |
| `trusted_adult` | Steward declaration | Guardian link `trusted_adult` |
| `business_member` / `business_admin` | `targetTrustUnitId`; no steward | Trust unit member only; no guardian; no sponsor bond |

**Invariant:** `User.role` is never set to `founder` from invite (still only first-user bootstrap).

---

## Child onboarding behavior

1. Inviter selects **Child or teen**, age bracket, and steward checkbox on `/invite`.
2. API rejects send without steward declaration.
3. Register page loads `?forRegister=1` hints → **requires date of birth**.
4. Register API rejects missing DOB or adult DOB on minor intent.
5. `materializeInviteOutcome` applies minor policy (family visibility, guardian approval, posting/invite restrictions) and links steward.

---

## Founder / steward behavior

| Concept | Behavior |
|---------|----------|
| Site founder | Unchanged — first user or admin only |
| Family steward | `stewardUserId` on invite + `AihGuardianRelationship` after register — **not** `User.role` |
| Network Msg Rules editor | Still singleton `AihFounderSettings` — not per-invite |

---

## Minimal UI

`/invite` compose chrome: **Who** dropdown (Adult / Child or teen / Business) + minor age + steward checkbox; adult still uses relationship picker.

---

## Safety

| Rule | Enforcement |
|------|-------------|
| Child unrestricted onboarding | DOB required + minor tier validation on register |
| Business → family authority | No guardian link; no steward fields on business |
| Adult friend → founder | No role change |
| Missing steward on child send | `STEWARD_DECLARATION_REQUIRED` |

---

## Remaining gaps (future agents)

- Full 5-step invite modal / policy preview copy
- AIH minor invite via **third-party** still uses guardian approval queue without steward declaration on deferred row
- Per-family Msg Rules steward (`AihFamilyUnit.stewardUserId`) not split from site founder settings
- `business_admin` org role on `TrustUnitMember` not modeled yet
- Verification script `verify-invite-intent-routing.ts`
- Legacy invites without `inviteIntent` infer `adult_friend` from `relationship`

---

## Files modified

| Area | Files |
|------|--------|
| Schema | `prisma/schema.prisma` |
| Types | `types/aihsafe/invite-intent.ts`, `types/aihsafe/index.ts` |
| Services | `lib/invite/index.ts`, `lib/aihsafe/invites/*.ts`, `lib/aihsafe/approvals/executeDeferredAction.ts` |
| API | `app/api/invite/route.ts`, `app/api/invite/[token]/route.ts`, `app/api/aihsafe/invites/route.ts`, `app/api/auth/register/route.ts` |
| UI | `app/(app)/invite/InviteClient.tsx`, `app/(auth)/register/page.tsx` |
| Docs | `docs/aihsafe/agent-73-invite-intent-routing-report.md` |

---

## Validation

| Command | Result |
|---------|--------|
| `npm run db:push` | Pass |
| `npm run db:generate` | Pass (after stopping Node) |
| `npm run typecheck` | Pass |
| `npx next build` | See CI / local run |

---

## Related

- [agent-72-invite-intent-founder-audit.md](./agent-72-invite-intent-founder-audit.md)
- [invite-intent-routing-map.md](./invite-intent-routing-map.md)
- [founder-steward-assignment-model.md](./founder-steward-assignment-model.md)
