# AIH Safe — API Topology
**AIH Safe API Contract Architect — contracts only. No live routes or persistence.**
**Agent 2.75 · 2026-05-09**

---

## Namespace

All AIH Safe routes live under `/api/aihsafe/`. They are additive — no existing route is modified.

Existing routes (`/api/trust/`, `/api/invite/`, `/api/members/`, etc.) remain untouched.
AIH Safe routes consume the governance and graph service layers; they never call existing routes.

---

## Authentication Model

Every route (except public read endpoints) requires a valid session cookie (`AMIHUMAN.NET_session`).
Use `requireAuth()` from `lib/auth/index.ts`. This is the only auth mechanism.

No new auth mechanism is introduced. No API keys. No separate AIH token.

---

## Route Groups

### `/api/aihsafe/family`

| Method | Path | Action | Auth |
|---|---|---|---|
| `POST` | `/api/aihsafe/family` | Create a family unit | Required |
| `GET` | `/api/aihsafe/family` | List family units for current user | Required |
| `GET` | `/api/aihsafe/family/[familyUnitId]` | Get a single family unit | Required |
| `PATCH` | `/api/aihsafe/family/[familyUnitId]` | Update name / status | Required |
| `DELETE` | `/api/aihsafe/family/[familyUnitId]` | Dissolve (soft-delete) | Required, creator only |

**Governance gate:** `canCreateTrustUnit` (reused; kind = `family`). Adults only.

---

### `/api/aihsafe/trust-units`

| Method | Path | Action | Auth |
|---|---|---|---|
| `POST` | `/api/aihsafe/trust-units` | Create a trust unit | Required |
| `GET` | `/api/aihsafe/trust-units` | List trust units for current user | Required |
| `GET` | `/api/aihsafe/trust-units/[trustUnitId]` | Get a trust unit + members | Required |
| `PATCH` | `/api/aihsafe/trust-units/[trustUnitId]` | Update meta (kind, scope) | Required, creator/moderator |
| `DELETE` | `/api/aihsafe/trust-units/[trustUnitId]` | Dissolve | Required, creator |

**Governance gate:** `canCreateTrustUnit`. Creates `AihTrustUnitMeta` sidecar.

---

### `/api/aihsafe/memberships`

| Method | Path | Action | Auth |
|---|---|---|---|
| `POST` | `/api/aihsafe/memberships` | Join a trust unit (self or via invite) | Required |
| `DELETE` | `/api/aihsafe/memberships/[membershipId]` | Exit a trust unit | Required |
| `PATCH` | `/api/aihsafe/memberships/[membershipId]` | Change role | Required, moderator+ |

**Governance gate:** `canJoinTrustUnit`, `canManageMembership`.
Teen join → escalates to `canApproveChildAction` via approval request.

---

### `/api/aihsafe/guardian-links`

| Method | Path | Action | Auth |
|---|---|---|---|
| `POST` | `/api/aihsafe/guardian-links` | Create guardian relationship | Required |
| `GET` | `/api/aihsafe/guardian-links` | List relationships for current user | Required |
| `GET` | `/api/aihsafe/guardian-links/[relationshipId]` | Get single relationship | Required |
| `PATCH` | `/api/aihsafe/guardian-links/[relationshipId]` | Update permission level | Required, guardian or admin |
| `DELETE` | `/api/aihsafe/guardian-links/[relationshipId]` | Revoke (soft-delete) | Required, guardian or admin |

**Governance gate:** `canCreateChildAccount` / `canManageMembership`. Adults only can create.
No escalation path — guardian link creation is always guardian-initiated.

---

### `/api/aihsafe/invites`

| Method | Path | Action | Auth |
|---|---|---|---|
| `POST` | `/api/aihsafe/invites` | Send an AIH Safe invite | Required |
| `GET` | `/api/aihsafe/invites` | List sent invites for current user | Required |
| `GET` | `/api/aihsafe/invites/[inviteId]` | Get invite status | Required |
| `DELETE` | `/api/aihsafe/invites/[inviteId]` | Cancel invite | Required, sender |

**Governance gate:** `canInviteToTrustUnit`.
Inviting a minor → `requiredApproval: true` → creates `AihApprovalRequest`.
Delegates underlying invite creation to `lib/invite/index.ts`.

---

### `/api/aihsafe/approvals`

| Method | Path | Action | Auth |
|---|---|---|---|
| `GET` | `/api/aihsafe/approvals` | List pending approvals for current user (as guardian) | Required |
| `GET` | `/api/aihsafe/approvals/[requestId]` | Get approval request detail | Required |
| `POST` | `/api/aihsafe/approvals/[requestId]/approve` | Approve a pending request | Required, guardian |
| `POST` | `/api/aihsafe/approvals/[requestId]/deny` | Deny a pending request | Required, guardian |

**Governance gate:** `canApproveChildAction`. Guardian with `APPROVER` or `FULL_CONTROL` permission level.
Approval/deny transitions `AihApprovalRequest.state` and emits the corresponding audit event.
Approval also executes the deferred original action.

---

### `/api/aihsafe/content`

| Method | Path | Action | Auth |
|---|---|---|---|
| `POST` | `/api/aihsafe/content` | Post content to a trust/family unit | Required |
| `GET` | `/api/aihsafe/content` | List content visible to current user | Required |
| `GET` | `/api/aihsafe/content/[contentId]` | Get single content item | Required |
| `PATCH` | `/api/aihsafe/content/[contentId]` | Update visibility scope | Required, owner |
| `DELETE` | `/api/aihsafe/content/[contentId]` | Remove content | Required, owner or moderator |
| `POST` | `/api/aihsafe/content/[contentId]/comments` | Comment on content | Required |
| `POST` | `/api/aihsafe/content/[contentId]/messages` | Message via content thread | Required |

**Governance gate:** `canPostContent`, `canComment`, `canMessage`.
Child/preteen post → escalates. Teen post → allowed.
**Phase 4+ only** — content storage integration not yet designed.

---

### `/api/aihsafe/visibility`

| Method | Path | Action | Auth |
|---|---|---|---|
| `GET` | `/api/aihsafe/visibility/resolve` | Resolve max scope for current user | Required |
| `POST` | `/api/aihsafe/visibility/check` | Check if actor can view a resource | Required |

Pure read/compute — no DB writes. Delegates to `lib/aihsafe/visibility/`.

---

### `/api/aihsafe/audit`

| Method | Path | Action | Auth |
|---|---|---|---|
| `GET` | `/api/aihsafe/audit` | List audit events for current user as actor | Required |
| `GET` | `/api/aihsafe/audit/[targetId]` | List audit events for a target resource | Required, admin/guardian |

Read-only. Delegates to `lib/aihsafe/audit/getAuditEventsForTarget`.
**Phase 3+** — returns `[]` until `aih_audit_events` table exists.

---

## Route Implementation Order

Phase 3 (implement after schema is live):
1. `/api/aihsafe/guardian-links` — foundational, needed by all minor flows
2. `/api/aihsafe/family` — family unit creation
3. `/api/aihsafe/approvals` — guardian inbox
4. `/api/aihsafe/trust-units` — trust unit management
5. `/api/aihsafe/memberships` — join/exit flows
6. `/api/aihsafe/invites` — invite wrapper

Phase 4:
7. `/api/aihsafe/content` — after storage integration
8. `/api/aihsafe/visibility` — after content exists
9. `/api/aihsafe/audit` — after `aih_audit_events` table is wired

---

## Relation to Existing Routes

| Existing route | AIH Safe interaction |
|---|---|
| `POST /api/invite` | `/api/aihsafe/invites` delegates write to `lib/invite/index.ts` — does NOT call existing route |
| `POST /api/trust/create-request` | Separate flow — AIH Safe trust units use `canCreateTrustUnit` gate and `AihTrustUnitMeta` sidecar |
| `GET /api/members` | AIH Safe uses `filterVisibleUsers` from visibility service — does NOT call existing route |
| `GET /api/profile` | Read-only; AIH Safe routes may read profile data via `getCurrentUser()` |

No existing route is modified. No existing route calls an AIH Safe route.
