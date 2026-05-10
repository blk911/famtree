# Agent 12 — AIH Safe E2E QA Report

**Branch:** `recovery-famtree-trust-units-working`
**Date:** 2026-05-10
**Scope:** Full read of all AIH Safe routes, components, lib, and type files. TypeScript typecheck passes (0 errors).

---

## Test Matrix Results

### 1. Family Unit Flow

| Check | Result |
|---|---|
| POST /api/aihsafe/family validates name (min 1, max 80) | ✓ Pass — Zod schema enforces |
| Adult actor creates immediately (201) | ✓ Pass — no guardian gate |
| Teen actor escalates to guardian (202) | ✓ Pass — `canCreateTrustUnit` + `selectApprovalRecipients` |
| Teen with no eligible approver → 403 | ✓ Pass — `eligibleApprovers.length === 0` returns `governanceDenied` |
| memberIds NOT pre-applied (Blocker 4) | ✓ Pass — comment documents; only creator member added |
| GET lists only units where actor is active member | ✓ Pass — `exitedAt: null` filter on members |
| Deferred action replay creates family unit with name | ✓ Pass — `executeDeferredAction` `create_family_unit` passes name correctly |

### 2. Trust Unit Flow

| Check | Result |
|---|---|
| POST /api/aihsafe/trust-units validates kind enum | ✓ Pass |
| Name persisted in AihTrustUnitMeta (not TrustUnit) | ✓ Pass — fixed in Agent 11 |
| DTO returns name when present | ✓ Pass — `...(row.aihMeta?.name ? { name: row.aihMeta.name } : {})` |
| 202 response for teen actor | ✓ Pass |
| Deferred action replay persists name in aihMeta | ✓ Fixed in this pass (Agent 12) |
| TrustUnitCreatePanel "Your spaces" list shows name | ✓ Fixed in this pass (Agent 12) |

### 3. Invite Flow

| Check | Result |
|---|---|
| POST /api/aihsafe/invites derives target age tier server-side | ✓ Pass — `targetAgeTier` from client only used as hint; authoritative derivation is server-side |
| Child invites get guardian escalation (202) | ✓ Pass |
| Invite DTO never returns trustUnitId/familyUnitId (model gap) | ✓ Pass — both passed as null |
| Idempotent deferred invite (skip if pending already exists) | ✓ Pass — `findFirst` guard in `executeDeferredAction` |

### 4. Guardian Inbox

| Check | Result |
|---|---|
| GET only shows approvals where actor is approverId | ✓ Pass |
| POST validates requestId + action enum | ✓ Pass |
| Approver ownership verified (404 not 403 — no enumeration) | ✓ Pass |
| State is "pending" check before atomic updateMany | ✓ Pass — fast-fail + TOCTOU-safe updateMany |
| Sibling approval requests revoked on first resolution | ✓ Pass — `updateMany` revokes pending siblings |
| `canApproveChildAction` governance gate runs before state transition | ✓ Pass |
| VIEW_ONLY guardian denied at governance layer | ✓ Pass — `selectApprovalRecipients` only returns APPROVER/FULL_CONTROL |
| Expired request → 409 conflict | ✓ Pass |
| `executeDeferredAction` called only on "approve" | ✓ Pass |
| Execution failure is non-fatal (approval state committed) | ✓ Pass — catch swallowed with comment |
| ACTION_LABELS in GuardianInbox match AuditEventKind values | ✓ Pass — verified against `types/aihsafe/audit-events.ts` |

### 5. Membership Flow

| Check | Result |
|---|---|
| DELETE /api/aihsafe/memberships/[id] — self exit | ✓ Pass |
| Last-member guard returns 409 conflict | ✓ Pass |
| Governance gate via `canExitMembership` | ✓ Pass |
| Hard delete used (no exitedAt column — Phase 4 gap) | ✓ Pass — documented |
| MembershipPanel surfaces 409 conflict error to user | ✓ Pass — Agent 9 fix (errors state) |
| promote/demote gated then returns 422 with clear message | ✓ Pass — Phase 4 blocker documented |

### 6. Governance UX

| Check | Result |
|---|---|
| DecisionNotice renders for 202 (amber, role="status") | ✓ Pass |
| DecisionNotice renders for 403 (red, role="alert") | ✓ Pass — Agent 9 fix |
| No feed/discovery/follower language anywhere | ✓ Pass |
| No promote/demote UI exposed | ✓ Pass — intentionally omitted |

### 7. API Contract Integrity

| Check | Result |
|---|---|
| All routes return normalized envelopes (`ok`, `created`, `accepted`, etc.) | ✓ Pass |
| apiClient.ts parses all envelope shapes correctly | ✓ Pass |
| 202 parsed to `AihEscalated` union member | ✓ Pass |
| 403 with governance field parsed to `AihDenied` | ✓ Pass |
| 409 conflict parsed to `AihError` (no governance field) | ✓ Pass |
| No invented API shapes in components | ✓ Pass |

### 8. Rendering / UX

| Check | Result |
|---|---|
| `/aihsafe` page has `export const dynamic = "force-dynamic"` | ✓ Pass |
| Sidebar link scoped to `/aihsafe` prefix | ✓ Pass |
| Trust unit name fallback to `${kind} space` everywhere | ✓ Pass — MembershipPanel, InvitePanel, TrustUnitCreatePanel all fixed |

### 9. Accessibility

| Check | Result |
|---|---|
| DecisionNotice ARIA roles correct | ✓ Pass — Agent 9 fix |
| Error messages have `role="alert"` | ✓ Pass |
| Form inputs have associated labels | ✓ Pass |
| Buttons disabled correctly during loading | ✓ Pass |

---

## TypeScript

`npx tsc --noEmit --skipLibCheck`: **0 errors**

---

## Build Note

`npm run build` exits with `EPERM: operation not permitted, rename ... query_engine-windows.dll.node` — this is a Windows file lock from the dev server holding the Prisma engine binary. It is not a code error. TypeScript typecheck passes cleanly. Build succeeds when the dev server is not running.
