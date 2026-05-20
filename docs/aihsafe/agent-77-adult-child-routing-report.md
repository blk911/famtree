# Agent 77 — Adult Child / Over-18 Family Relationship Report

**Branch:** `aihsafe-agent-77-adult-child-routing`  
**Date:** 2026-05-19

## Summary

Added an explicit **`adult_child`** invite intent and **Child / teen / adult child** UX with three age groups (Under 13, 13–17, 18+). Under-18 paths keep Boundaries and steward declaration; **18+** joins as an adult family participant with **Msg Rules** (member shell), no guardian link, and no child policy defaults.

---

## Fields / types added

| Item | Value |
|------|--------|
| `InviteIntent.ADULT_CHILD` | `"adult_child"` |
| `relationshipKind` (default) | `"adult_child"` |
| `InviteeAgeBracket` | unchanged — `child` / `teen` / `adult` mapped from UI groups |
| UI `InviteKind` | `family_youth` (replaces internal `minor` chip id) |
| UI `FamilyYouthAgeGroup` | `under_13` \| `teen_13_17` \| `over_18` |

**Helpers:** `isAdultChildInviteIntent()`, `isFamilyParticipantIntent()`, `requiresDateOfBirthAtRegister()` includes adult_child.

**Prisma:** comment on `Invite.inviteIntent` updated (string field — no migration).

---

## Files modified

| File | Change |
|------|--------|
| `types/aihsafe/invite-intent.ts` | `ADULT_CHILD`, helpers, infer + default relationship kind |
| `components/invite/inviteUxCopy.ts` | `family_youth` kind, age groups, copy, intent mapping |
| `app/(app)/invite/InviteClient.tsx` | Three age chips, steward only &lt;18, API payload |
| `lib/aihsafe/invites/routeByIntent.ts` | Validate adult_child (no steward, adult bracket) |
| `lib/aihsafe/invites/materializeInviteOutcome.ts` | Family unit as `adult`, profile `familyRole: child`, no guardian |
| `lib/aihsafe/invites/inviteRegisterPolicy.ts` | `validateAdultChildInviteeAge()` |
| `lib/aihsafe/invites/validateRegisterInvite.ts` | Register-time adult_child checks |
| `app/api/invite/[token]/route.ts` | `isAdultChildInvite` for register UI |
| `app/(auth)/register/page.tsx` | Adult-child register copy + DOB requirement |
| `prisma/schema.prisma` | Intent enum comment |
| `scripts/aihsafe/verify-invite-intent-enforcement.ts` | +7 checks (39 total) |

---

## Invite UX changes

- **Label:** “Child / teen / adult child” (was “Child or teen”).
- **Age groups:** Under 13 → `child` intent; 13–17 → `teen`; **18+** → `adult_child`.
- **Under 18:** Boundaries note + steward checkbox (unchanged behavior).
- **18+:** “Adult family members join trusted family spaces without child Boundaries…” — no steward checkbox.
- **Family member** chip unchanged for siblings/spouse/cousin (`family_adult`).

---

## Routing behavior

| Age group | `inviteIntent` | `inviteeAgeBracket` | Steward | Materialize |
|-----------|----------------|---------------------|---------|-------------|
| Under 13 | `child` | `child` | Required | Guardian link + family unit `child` + minor policy |
| 13–17 | `teen` | `teen` | Required | Same (teen tier) |
| 18+ | `adult_child` | `adult` | **Forbidden** | Family unit `adult`, profile `familyRole: child`, no guardian |
| Family member (adult) | `family_adult` | `adult` | No | Optional target family unit / sponsor TU |
| Friend | `adult_friend` | `adult` | No | Sponsor only |

**Safety:**

- Teen/child DOB cannot register on `adult_child` invite (`ADULT_CHILD_MUST_BE_ADULT`).
- Adult DOB cannot register on child/teen invite (`DOB_NOT_MINOR`).
- Steward on 18+ invite rejected at route (`ADULT_CHILD_STEWARD_NOT_ALLOWED`).
- Business + steward still blocked.

---

## Adult family semantics

- **Not** `adult_friend` — keeps family tree / `invitedById` sponsor, family unit membership.
- **Not** child governance — no `applyMinorInvitePolicyDefaults`, no guardian relationship.
- **Not** site founder — `role` stays `member` (unchanged).
- **Family Safe:** `deriveShellMode` → `member` → **Msg Rules** tab (not Boundaries).
- **Profile:** `familyRole` set to `child` (adult son/daughter label in tree UI).

---

## Child governance preservation

- Under 13 and 13–17 paths unchanged: `child` / `teen` intents, steward required, Boundaries at register.
- `validateInviteAgeBracketMatchesTier` still enforced for minors.
- No cross-leak from business intents.

---

## Remaining gaps

1. **Adult sibling/cousin 18+** — still use **Family member** (`family_adult`), not `adult_child` (by design).
2. **Manual family unit** — if inviter has no family unit, `attachToFamilyUnit` still creates one (same as minors).
3. **Trust unit auto-slot** — `adult_child` does not auto-resolve sponsor TU pending (like child); family attachment only.
4. **E2E browser QA** — not run in this pass.
5. **Existing invites** — legacy rows without `inviteIntent` still infer via `resolveInviteIntentFromRow`.

---

## Validation results

| Command | Result |
|---------|--------|
| `npm run typecheck` | ✅ Pass |
| `npm run verify:invite-intent` | ✅ 39/39 |
| `npx next build` | ✅ Pass |
