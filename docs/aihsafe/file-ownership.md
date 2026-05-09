# AIH Safe — File Ownership Map
**Agent 0 / Architect pass · 2026-05-09**

---

## Ownership Key

| Symbol | Meaning |
|---|---|
| `[EXISTING]` | Pre-exists — do not modify without explicit cross-agent coordination |
| `[SAFE-OWN]` | Owned by AIH Safe scaffold — agents may extend |
| `[SHARED]` | Shared contract — changes require architect sign-off |
| `[READ-ONLY]` | AIH Safe agents may read but never write |

---

## Auth Layer

| Path | Owner | Notes |
|---|---|---|
| `lib/auth/index.ts` | `[EXISTING]` | `getCurrentUser`, `requireAuth` — read only |
| `lib/auth/session-cookie.ts` | `[EXISTING]` | Cookie name constant — read only |
| `lib/auth/jwt-secret.ts` | `[EXISTING]` | Key getter — read only |
| `middleware.ts` | `[EXISTING]` | Edge auth — extend PROTECTED array if needed, document change |
| `app/api/auth/` | `[EXISTING]` | Do not modify |

---

## User / Profile Layer

| Path | Owner | Notes |
|---|---|---|
| `prisma/schema.prisma` | `[EXISTING]` | Schema-first — AIH Safe models go here only after Agent 1 plan approved |
| `types/index.ts` | `[EXISTING]` | Do not modify; `SafeUser` is the shared DTO |
| `lib/db/prisma.ts` | `[EXISTING]` | Singleton — import, do not re-create |
| `app/api/profile/` | `[EXISTING]` | Do not modify |
| `app/api/members/` | `[EXISTING]` | Do not modify |

---

## Invite Layer

| Path | Owner | Notes |
|---|---|---|
| `lib/invite/index.ts` | `[EXISTING]` | Adult invite flow — do not modify |
| `app/api/invite/` | `[EXISTING]` | Do not modify |
| `lib/aihsafe/invites/index.ts` | `[SAFE-OWN]` | AIH Safe invite wrapper — agents may implement here |

---

## Trust / Connection Layer

| Path | Owner | Notes |
|---|---|---|
| `lib/trust/index.ts` | `[EXISTING]` | TrustUnit logic — read only |
| `lib/trust/adjacency.ts` | `[EXISTING]` | Read only |
| `lib/trust/tuProposal.ts` | `[EXISTING]` | Read only |
| `app/api/trust/` | `[EXISTING]` | Do not modify |
| `app/api/connections/` | `[EXISTING]` | Do not modify |
| `lib/aihsafe/graph/index.ts` | `[SAFE-OWN]` | Trust graph service stub — Agent 1 implements |

---

## Governance Layer (net-new)

| Path | Owner | Notes |
|---|---|---|
| `lib/aihsafe/governance/index.ts` | `[SAFE-OWN]` | Guardian relationship service stub — Agent 2 implements |
| `lib/aihsafe/audit/index.ts` | `[SAFE-OWN]` | Typed audit event service stub — Agent 2 implements |
| `lib/aihsafe/visibility/index.ts` | `[SAFE-OWN]` | Visibility scope service stub — Agent 2 implements |

---

## Shared Primitives (net-new)

| Path | Owner | Notes |
|---|---|---|
| `types/aihsafe/ids.ts` | `[SHARED]` | Branded ID types — stable contract |
| `types/aihsafe/roles.ts` | `[SHARED]` | Role enum — maps to existing User.role strings |
| `types/aihsafe/age-tiers.ts` | `[SHARED]` | Age tier classification |
| `types/aihsafe/visibility.ts` | `[SHARED]` | Visibility scope enum |
| `types/aihsafe/approval-states.ts` | `[SHARED]` | Approval state machine |
| `types/aihsafe/invite-states.ts` | `[SHARED]` | Invite state machine (mirrors existing InviteStatus) |
| `types/aihsafe/audit-events.ts` | `[SHARED]` | Typed audit event kinds |
| `types/aihsafe/trust-units.ts` | `[SHARED]` | Trust unit primitives |
| `types/aihsafe/guardian.ts` | `[SHARED]` | Guardian relationship types |
| `types/aihsafe/membership.ts` | `[SHARED]` | Membership types |

---

## Admin / Activity Layer

| Path | Owner | Notes |
|---|---|---|
| `lib/activity/log.ts` | `[EXISTING]` | Admin activity log — read only; AIH Safe audit wraps this |
| `app/api/admin/` | `[EXISTING]` | Do not modify |
| `components/admin/` | `[EXISTING]` | Do not modify |

---

## API Namespace Reservation

| Namespace | Owner | Status |
|---|---|---|
| `app/api/aihsafe/` | `[SAFE-OWN]` | Reserved — not yet created; Agent 1+ populates |

---

## Docs

| Path | Owner | Notes |
|---|---|---|
| `docs/aihsafe/` | `[SAFE-OWN]` | All AIH Safe architectural docs |
| `docs/` (other) | `[EXISTING]` | Do not modify |
| `CLAUDE.md` | `[EXISTING]` | Repo-wide — append-only if needed; architect approves |
