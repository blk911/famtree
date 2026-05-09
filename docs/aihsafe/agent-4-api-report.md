# AIH Safe — Agent 4 Implementation Report
**Agent 4 · API Route Foundation · 2026-05-09**

---

## 1. Files Created

| File | Action |
|---|---|
| `lib/aihsafe/api/envelopes.ts` | Created — typed `NextResponse.json()` helpers for all envelope shapes |
| `lib/aihsafe/api/parse.ts` | Created — request body parsing + pagination helpers |
| `lib/aihsafe/api/index.ts` | Created — barrel export |
| `app/api/aihsafe/guardian-links/route.ts` | Created — `POST` create + `GET` list guardian relationships |
| `app/api/aihsafe/approvals/route.ts` | Created — `GET` guardian inbox + `POST` resolve (approve/deny) |
| `app/api/aihsafe/family/route.ts` | Created — `POST` create + `GET` list family units |
| `app/api/aihsafe/trust-units/route.ts` | Created — `POST` create + `GET` list trust units |
| `app/api/aihsafe/memberships/route.ts` | Created — `POST` join trust unit |
| `app/api/aihsafe/invites/route.ts` | Created — `POST` send invite + `GET` list sent invites |
| `lib/aihsafe/index.ts` | Modified — added `export * from "./api"` |
| `docs/aihsafe/service-boundaries.md` | (pending update — see §10) |
| `docs/aihsafe/agent-4-api-report.md` | Created — this file |

---

## 2. Shared API Helpers

### `lib/aihsafe/api/envelopes.ts`

| Export | Shape | HTTP |
|---|---|---|
| `ok<T>(data)` | `SuccessResponse<T>` | 200 |
| `created<T>(data)` | `SuccessResponse<T>` | 201 |
| `accepted(pending, decision, requestId)` | `AcceptedResponse` | 202 |
| `unauthenticated()` | `ErrorResponse` | 401 |
| `governanceDenied(decision)` | `ErrorResponse` + `governance` | 403 |
| `notFound(msg?)` | `ErrorResponse` | 404 |
| `conflict(msg)` | `ErrorResponse` | 409 |
| `validationFail(msg, fields?)` | `ErrorResponse` | 422 |
| `unprocessable(msg)` | `ErrorResponse` | 422 |
| `serverError(msg?)` | `ErrorResponse` | 500 |
| `toGovernanceDTO(decision, requestId?)` | `GovernanceDecisionDTO` | — |
| `approvalExpiresAt()` | `Date` (now + 48h) | — |
| `genRequestId()` | `string` (UUID) | — |

### `lib/aihsafe/api/parse.ts`

| Export | Purpose |
|---|---|
| `readJson(req)` | Parse request body as JSON; returns `null` on empty/invalid |
| `parsePagination(req)` | Extract `cursor` + `limit` (clamped 1–100, default 20) from query |
| `isNonEmptyString(v)` | Type guard |

---

## 3. Route Implementations

### `POST /api/aihsafe/guardian-links`

1. `requireAuth()` → 401 if absent
2. `buildActorContext(actorId)` → 500 if fails
3. Zod parse: `{ childUserId, kind, permissionLevel }`
4. Load child user from DB → 404 if not found/active
5. `canCreateChildAccount(actor, target)` → 403 if denied
6. Duplicate check → 409 if active link exists
7. `aihGuardianRelationship.upsert` (re-activate revoked links)
8. `emitAuditEvent(GUARDIAN_LINKED)` → 201

### `GET /api/aihsafe/guardian-links`

Lists all guardian relationships where actor is guardian OR child. Cursor-paginated.

### `POST /api/aihsafe/approvals`

1. `requireAuth()` + `buildActorContext()`
2. Zod parse: `{ requestId, action: "approve" | "deny", note? }`
3. Load `AihApprovalRequest` → 404 if not found or not actor's
4. Check state = pending → 409 if already resolved
5. Check not expired → 409 if expired
6. `canApproveChildAction(actor, target)` → 403 if denied
7. `aihApprovalRequest.update({ state, resolvedAt })`
8. `emitAuditEvent(GUARDIAN_CONSENT_GIVEN | GUARDIAN_CONSENT_DENIED)` → 200

### `GET /api/aihsafe/approvals`

Guardian inbox: lists `AihApprovalRequest` where `approverId = actorId`. State filter via `?state=pending` (default) / `approved` / `denied`. Cursor-paginated.

### `POST /api/aihsafe/family`

1. `requireAuth()` + `buildActorContext()`
2. Zod parse: `{ name, memberIds? }`
3. `canCreateTrustUnit(actor, { kind: "family" })` → 403 deny / 202 escalate / proceed
4. Escalation: create `AihApprovalRequest`, return 202
5. `aihFamilyUnit.create` with creator as `guardian` member → 201

### `GET /api/aihsafe/family`

Lists family units where actor is an active member. Cursor-paginated.

### `POST /api/aihsafe/trust-units`

1. `requireAuth()` + `buildActorContext()`
2. Zod parse: `{ kind, name?, memberIds?, defaultVisibilityScope?, maxMemberCount? }`
3. `canCreateTrustUnit(actor, { kind })` → 403 deny / 202 escalate / proceed
4. Escalation: create `AihApprovalRequest`, return 202
5. `trustUnit.create` + `aihMeta.create` sidecar + creator member → 201

### `GET /api/aihsafe/trust-units`

Lists trust units where actor has a membership. Cursor-paginated.

### `POST /api/aihsafe/memberships`

1. `requireAuth()` + `buildActorContext()`
2. Zod parse: `{ trustUnitId }`
3. Load trust unit → 404 if not found
4. Check existing membership → 409 if already member
5. `canJoinTrustUnit(actor, target)` → 403 deny / 202 escalate / proceed
6. `trustUnitMember.create` → 201 `{ membershipId }`

### `POST /api/aihsafe/invites`

1. `requireAuth()` + `buildActorContext()`
2. Zod parse: `{ recipientEmail, relationship, trustUnitId?, familyUnitId?, targetAgeTier? }`
   - Requires at least one of trustUnitId/familyUnitId
3. `canInviteToTrustUnit(actor, target)` → 403 deny / 202 escalate / proceed
4. Escalation: create `AihApprovalRequest`, return 202
5. Delegate to existing `createInvite()` from `lib/invite`
6. `emitAuditEvent(INVITE_SENT_CHILD | INVITE_GUARDIAN_APPROVED)` → 201

### `GET /api/aihsafe/invites`

Lists all invites sent by actor (delegates to `prisma.invite`). Cursor-paginated.

---

## 4. Governance Gate Mapping

| Route | Gate used | Escalates? |
|---|---|---|
| `POST /guardian-links` | `canCreateChildAccount` | No — adults only |
| `POST /approvals` | `canApproveChildAction` | No |
| `POST /family` | `canCreateTrustUnit({ kind: "family" })` | Yes (teens) |
| `POST /trust-units` | `canCreateTrustUnit({ kind })` | Yes (teens) |
| `POST /memberships` | `canJoinTrustUnit` | Yes (teens) |
| `POST /invites` | `canInviteToTrustUnit` | Yes (adult inviting minor) |

---

## 5. Approval Request Protocol

All escalating routes follow the same pattern:
1. Find eligible guardians: `actor.guardedByRelationships` where `revokedAt === null` AND `permissionLevel ∈ { approver, full_control }`.
2. If no eligible guardians → 403 (same as hard deny — no path forward).
3. Create `AihApprovalRequest` for `eligibleApprovers[0]` with `contextJson` snapshot.
4. Emit audit event with `escalated: true`.
5. Return 202 with `AcceptedResponse` carrying `PendingEscalationDTO` + `GovernanceDecisionDTO`.

`contextJson` is typed as `Prisma.InputJsonValue` at the DB write boundary, consistent with Agent 3's `audit/index.ts` pattern.

---

## 6. TypeScript Fix Applied

`[...new Set(...)]` spread fails under the project's TS target. All Set spreads replaced with `Array.from(new Set(...))`.

---

## 7. Validation Results

| Check | Result |
|---|---|
| `typecheck` | ✅ Zero errors |
| `build` | ✅ "Compiled successfully" |
| Existing routes changed | No |
| New routes added | 9 route handlers across 6 files |
| Pre-existing build warnings | Unchanged (dynamic `cookies` warnings on authenticated pages) |

---

## 8. Known Limitations (Phase 4)

| Limitation | Notes |
|---|---|
| Multiple guardian notification | Only first eligible guardian gets an `AihApprovalRequest`. Phase 4 should fan out to all. |
| `TrustUnit.name` field | May not exist on older TrustUnit rows (schema has no `name` column confirmed). Trust-unit creation passes `name` via spread; field silently ignored if absent. |
| Approval re-execution | When a guardian approves, the deferred action (`contextJson`) is not auto-re-executed. Phase 4 adds a background job for this. |
| Membership exit / remove | `ManageMembership` (exit/remove/promote/demote) not implemented — Phase 4. |
| Family unit invite association | Invite records have no `trustUnitId` / `familyUnitId` FK — association tracked in audit meta only until Phase 4 adds the column. |

---

## 9. Next Recommended Agent

**Agent 5 — Integration QA + Security Review**

Recommended scope:
- Verify each route end-to-end with local curl or a test client
- Check for authorization bypass: can actor A access actor B's approval requests?
- Check duplicate-escalation: re-POSTing an escalated action before the guardian responds
- Review `contextJson` data for PII leakage
- Validate pagination cursor behavior (off-by-one, empty pages)
- Confirm audit event emission for every code path (allow + deny + escalate)
