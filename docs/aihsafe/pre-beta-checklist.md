# AIH Safe — Pre-Beta Checklist

Gates that must pass before AIH Safe features are exposed to real users. Updated at end of Agent 12.

---

## P0 — Must fix before any user traffic

- [x] `/aihsafe` page renders without build error (`dynamic = "force-dynamic"`)
- [x] Trust unit name persists in `AihTrustUnitMeta` (schema migration + route fix)
- [x] Deferred action replay (`executeDeferredAction`) persists trust unit name for guardian-escalated creates
- [x] 409 last-member conflict surfaced to user in MembershipPanel
- [x] `DecisionNotice` ARIA roles correct (role="alert" for denials)
- [x] TypeScript typecheck passes (0 errors)

## P1 — Should fix before beta

- [ ] `DecisionNotice` dismiss button needs `aria-label="Dismiss"` (accessibility)
- [ ] GuardianInbox should show action context (name/kind) so guardian knows what they're approving — requires `ApprovalRequestDTO` to carry a `contextSummary` field
- [ ] `TrustUnitCreatePanel` success message should show the space name, not just kind

## P2 — Can ship to beta, fix in follow-up

- [ ] MembershipPanel: disable "Leave space" button when user is sole member (with tooltip) — server guard is correct, this is UX polish
- [ ] `FamilyCreatePanel`: add inline list of existing family units (feature parity with TrustUnitCreatePanel)
- [ ] `InvitePanel`: clarify that `targetAgeTier` / relationship picker is a hint; server determines actual consent gate

## Phase 4 Schema Gaps (not pre-beta blockers)

These are documented limitations, not bugs. They are blocked on schema migration:

- [ ] `TrustUnitMember.role` column — enables promote/demote; soft-delete via `exitedAt`
- [ ] `Invite.trustUnitId` / `Invite.familyUnitId` — enables invite-to-space flows
- [ ] `canCreateTrustUnit` audit kind alignment (uses `FAMILY_UNIT_CREATED` internally)

## Infrastructure / Ops

- [ ] Verify `AihApprovalRequest` records are expired-and-cleaned by a cron or scheduled job (no TTL enforcement mechanism currently exists in code)
- [ ] Confirm `aih_audit_events` table is append-only at DB level (no DELETE grants on the table)
- [ ] Load test `buildActorContext` under concurrent requests — it runs 3 parallel Prisma queries per request
- [ ] Add rate limiting to `/api/aihsafe/invites` POST (no limit currently)

## QA Sign-off

| Agent | Area | Status |
|---|---|---|
| Agent 8 | UX shell scaffold | ✓ Done |
| Agent 9 | UX contract QA | ✓ Done |
| Agent 10 | DTO name field | ✓ Done |
| Agent 11 | Name persistence (schema + route) | ✓ Done |
| Agent 12 | E2E QA + deferred action fix + name consistency | ✓ Done |
