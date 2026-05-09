# AIH Safe — Pre-UX Blockers
**Agent 5 · 2026-05-09**

Items that MUST be resolved before UX work begins or before any public-facing surface is built.
Each item has a severity, a description of the gap, and the minimum viable fix.

---

## BLOCKER 1 — Deferred Action Re-execution (Approval Resolution)

**Severity:** Blocking for minor flows to be functionally complete.

**Gap:** When a guardian approves an `AihApprovalRequest`, the original deferred action (join trust unit, create family unit, send invite, etc.) is NOT executed. The guardian receives a resolved `ApprovalRequestDTO` but the underlying resource is never created. The `contextJson` snapshot is stored correctly but never read back.

**What exists:** `AihApprovalRequest.contextJson` contains the full action context (e.g., `{ action: "join_trust_unit", trustUnitId: "..." }`). The schema and audit trail are correct. Only the re-execution step is missing.

**Minimum viable fix (Phase 4):**
1. In `POST /api/aihsafe/approvals` when `action === "approve"`, read `approvalRequest.contextJson`.
2. Dispatch to a typed re-execution handler based on `approvalRequest.actionKind`.
3. Re-assemble `ActorContext` for the original requestor.
4. Re-run the governance gate — must pass (guardian just approved).
5. Execute the write as if the original request succeeded.
6. Emit the success audit event.
7. Return the created resource DTO alongside the resolved approval DTO.

**Risk if skipped:** Minors who submit actions and receive guardian approval see their action silently not applied. Guardian experience is broken.

---

## BLOCKER 2 — Multi-Guardian Fan-Out (Creation Side)

**Severity:** Blocking for families with multiple guardian accounts.

**Gap:** When a minor has multiple eligible guardians (`APPROVER` or `FULL_CONTROL`), the current code creates `AihApprovalRequest` only for `eligibleApprovers[0]`. The other guardians never see the request in their inbox. The flow map requires one request per guardian.

**What exists:** `selectApprovalRecipients()` already filters all eligible guardians correctly. The resolver already has sibling revocation (added in Agent 5). Only the creation loop is missing.

**Minimum viable fix (Phase 4):**
```typescript
// Replace single create with:
const approvalRequests = await Promise.all(
  eligibleApprovers.map(g =>
    prisma.aihApprovalRequest.create({
      data: {
        requestorId: user.id,
        approverId:  g.guardianUserId as string,
        actionKind,
        contextJson,
        expiresAt,
      },
    })
  )
);
// Return first request ID in the 202 response; sibling revocation handles the rest.
```

**Affects:** `family/route.ts`, `trust-units/route.ts`, `memberships/route.ts`, `invites/route.ts`.

**Risk if skipped:** In a two-guardian household only one guardian gets notified. The other guardian's inbox is always empty for escalated child actions.

---

## BLOCKER 3 — Membership Exit / Remove / Promote / Demote

**Severity:** Blocking for trust unit lifecycle management.

**Gap:** `DELETE /api/aihsafe/memberships/[membershipId]` and `PATCH /api/aihsafe/memberships/[membershipId]` are in the API topology but not implemented. Users cannot leave trust units or change roles.

**What exists:** Governance gate `canManageMembership` is implemented and correct. `TrustUnitMember` model supports `exitedAt` (once Phase 4 column is added). The route file currently handles only `POST` (join).

**Minimum viable fix (Phase 4):**
- `DELETE /memberships/[id]`: Set `exitedAt = now()` after `canManageMembership` gate.
- `PATCH /memberships/[id]`: Update role after `canManageMembership` gate (Phase 4 requires `role` column).

**Risk if skipped:** Users cannot leave groups. Group membership is permanent until an admin force-deletes records.

---

## BLOCKER 4 — `memberIds` Consent Model

**Severity:** High — minor protection gap.

**Gap:** `CreateFamilyUnitRequest.memberIds` and `CreateTrustUnitRequest.memberIds` allow an adult to pre-add arbitrary user IDs at unit creation. The added users' consent is not sought, and their age tiers are not checked. A minor could be added to a unit by an unrelated adult.

**What exists:** The creator is added correctly as `"guardian"`. Additional `memberIds` are added as `"adult"` without any check.

**Minimum viable fix (Phase 4):** Either:
a) Strip `memberIds` from all create requests; pre-adding members requires a separate invite flow.
b) For each `memberId`, verify the actor has an active guardian relationship (if the member is a minor) or that the member has an accepted invite.

**Risk if skipped:** An adult could add a child to a unit without guardian consent, bypassing the minor protection model.

---

## NON-BLOCKING GAPS (document before beta)

| Gap | Phase | Notes |
|---|---|---|
| `TrustUnitMember.role` always `"member"` | Phase 4 | Column missing on existing model |
| `TrustUnitMembership.exitedAt` always `null` | Phase 4 | Column missing |
| `listRelationshipEdgesForUser` reads `ConnectionRequest` | Phase 4 | Proxy; dedicated table needed |
| No test framework | — | No test runner detected in repo |
| Invite background expiry sweep | Phase 4 | Stale `PENDING` invites not auto-expired |
| Approval background expiry sweep | Phase 4 | `AihApprovalRequest` not expired by background job |
| `AuditEventKind.GOVERNANCE_DENIED` not emitted on hard denials | Phase 4 | Current code emits `decision.auditEventType` instead |
| No rate limiting on any AIH Safe route | Phase 4 | |
| No `Cache-Control: private, no-store` header on mutation responses | Phase 4 | Specified in transport-normalization.md |
