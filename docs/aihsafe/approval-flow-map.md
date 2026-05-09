# AIH Safe — Approval Flow Map
**AIH Safe API Contract Architect — contracts only. No live routes or persistence.**
**Agent 2.75 · 2026-05-09**

Exact lifecycle for every escalation flow. Each flow defines initiator, governance check,
approval request creation, audit emission, and final state transition.

---

## Flow 1 — Child Account Creation

**Trigger:** An adult creates an account for a child using `POST /api/aihsafe/guardian-links`.
(Child account creation by the adult means establishing a guardian link to an existing minor user,
or pre-registering a minor's email for future onboarding.)

**Initiator:** Adult user (guardian-to-be).

**Governance:** `canCreateChildAccount(actorContext, targetContext)`
- Actor must be ADULT tier.
- Hard-denied for any minor actor.
- No escalation — always either allowed or denied outright.

**State transitions:**
```
Adult calls POST /api/aihsafe/guardian-links
  │
  ├── canCreateChildAccount → allowed
  │     ├── Write AihGuardianRelationship { state: active }
  │     ├── emitAuditEvent(GUARDIAN_RELATIONSHIP_ESTABLISHED)
  │     ├── [stub] Notify both parties by email (Phase 4)
  │     └── Return 201 GuardianLinkDTO
  │
  └── canCreateChildAccount → denied
        ├── emitAuditEvent(GOVERNANCE_DENIED)
        └── Return 403 GovernanceDecisionDTO
```

**No approval request is created for this flow.** The guardian themselves initiates — no escalation is needed.

---

## Flow 2 — Teen Trust Expansion (Join a Trust Unit)

**Trigger:** A teen user calls `POST /api/aihsafe/memberships` to join an existing trust unit.

**Initiator:** Teen user.

**Governance:** `canJoinTrustUnit(actorContext, targetContext)`
- Teen → `{ allowed: false, requiredApproval: true }`

**State transitions:**
```
Teen calls POST /api/aihsafe/memberships { trustUnitId }
  │
  ├── canJoinTrustUnit → requiredApproval: true
  │     ├── Resolve guardian(s) with APPROVER+ level from actor's guardedByRelationships
  │     ├── For each active guardian:
  │     │     └── Write AihApprovalRequest {
  │     │           requestorId: teen.id,
  │     │           approverId: guardian.id,
  │     │           actionKind: "membership.granted",
  │     │           state: pending,
  │     │           contextJson: { trustUnitId, actorUserId: teen.id },
  │     │           expiresAt: now + 48h
  │     │         }
  │     ├── emitAuditEvent(CHILD_ACTION_REQUESTED, targetId: trustUnitId)
  │     ├── [stub] Notify guardian (Phase 4)
  │     └── Return 202 ApprovalRequestDTO + GovernanceDecisionDTO
  │
  │   Guardian calls POST /api/aihsafe/approvals/[requestId]/approve
  │     ├── canApproveChildAction → allowed
  │     ├── Deserialize contextJson → TargetContext
  │     ├── Re-assemble ActorContext for teen
  │     ├── canJoinTrustUnit(teenActor, target) → MUST pass
  │     ├── Write TrustUnitMember { userId: teen.id, trustUnitId, role: "member" }
  │     ├── Update AihApprovalRequest { state: approved, resolvedAt: now }
  │     ├── emitAuditEvent(CHILD_ACTION_APPROVED, targetId: trustUnitId)
  │     ├── [stub] Notify teen (Phase 4)
  │     └── Return 200 TrustUnitMemberDTO
  │
  │   Guardian calls POST /api/aihsafe/approvals/[requestId]/deny
  │     ├── canApproveChildAction → allowed
  │     ├── Update AihApprovalRequest { state: denied, resolvedAt: now }
  │     ├── emitAuditEvent(CHILD_ACTION_DENIED, targetId: trustUnitId)
  │     ├── [stub] Notify teen (Phase 4)
  │     └── Return 200 ApprovalRequestDTO
  │
  └── [Background sweep] 48h elapsed, state = pending
        ├── Set AihApprovalRequest { state: expired }
        └── emitAuditEvent(APPROVAL_EXPIRED, targetId: trustUnitId)
```

**Guardian count rule:** If the teen has multiple guardians with `APPROVER` or `FULL_CONTROL` permission level, an `AihApprovalRequest` is created for **each**. First guardian to respond (approve or deny) resolves all — subsequent guardian responses return 422.

---

## Flow 3 — Child/Preteen Content Escalation

**Trigger:** A child or preteen calls `POST /api/aihsafe/content`.

**Initiator:** Child or preteen user.

**Governance:** `canPostContent(actorContext, targetContext)`
- Child/Preteen → `{ allowed: false, requiredApproval: true }`

**State transitions:**
```
Child/Preteen calls POST /api/aihsafe/content { body, visibilityScope, trustUnitId }
  │
  ├── canPostContent → requiredApproval: true
  │     ├── Store draft intent in AihApprovalRequest.contextJson {
  │     │     body, visibilityScope, trustUnitId, actorUserId
  │     │   }
  │     ├── Write AihApprovalRequest { state: pending, actionKind: "content.posted" }
  │     ├── emitAuditEvent(CHILD_ACTION_REQUESTED)
  │     ├── [stub] Notify guardian (Phase 4)
  │     └── Return 202 { approvalRequestId, message: "Awaiting guardian approval." }
  │
  │   Guardian approves:
  │     ├── canApproveChildAction → allowed
  │     ├── Deserialize contextJson → { body, visibilityScope, trustUnitId }
  │     ├── Write AihContentPost { authorId: child.id, body, visibilityScope, trustUnitId }
  │     ├── Update AihApprovalRequest { state: approved }
  │     ├── emitAuditEvent(CHILD_ACTION_APPROVED)
  │     ├── emitAuditEvent(CONTENT_POSTED)
  │     └── Return 200 ContentDTO
  │
  │   Guardian denies:
  │     ├── Update AihApprovalRequest { state: denied }
  │     ├── emitAuditEvent(CHILD_ACTION_DENIED)
  │     └── Return 200 ApprovalRequestDTO { state: "denied" }
  │
  └── Expires: emitAuditEvent(APPROVAL_EXPIRED)
```

**The same pattern applies to `canComment` and `canMessage`.** Only `actionKind` differs.

---

## Flow 4 — Guardian Approval (Guardian-side View)

**Trigger:** Guardian opens their approval inbox (`GET /api/aihsafe/approvals`) and responds.

**Initiator:** Guardian user.

**Governance for the resolve step:** `canApproveChildAction(guardianActor, { targetUserId: requestor.id })`
- Requires active `AihGuardianRelationship` with `permissionLevel: "approver"` or `"full_control"`.
- `view_only` guardians CANNOT approve — they can only view.

**State machine:**

```
AihApprovalRequest.state

PENDING ──approve──→ APPROVED (terminal)
        ──deny────→ DENIED   (terminal)
        ──expire──→ EXPIRED  (terminal)
        ──revoke──→ REVOKED  (terminal — admin action only)

APPROVED, DENIED, EXPIRED, REVOKED are all terminal.
No state can transition from a terminal state.
```

**422 on terminal state transition attempt:**
```
POST /api/aihsafe/approvals/[requestId]/approve
where AihApprovalRequest.state = "denied"
→ 422 { error: "Approval request is already resolved.", currentState: "denied" }
```

---

## Flow 5 — Adult Inviting a Minor to a Trust Unit

**Trigger:** Adult calls `POST /api/aihsafe/invites` with `targetAgeTier` = minor.

**Initiator:** Adult user.

**Governance:** `canInviteToTrustUnit(actorContext, { targetAgeTier: "child"|"preteen"|"teen" })`
- Returns `{ allowed: false, requiredApproval: true }`

**State transitions:**
```
Adult calls POST /api/aihsafe/invites { recipientEmail, trustUnitId, targetAgeTier: "child" }
  │
  ├── canInviteToTrustUnit → requiredApproval: true
  │     ├── Do NOT create Invite record yet (invite is deferred)
  │     ├── Look up guardians for the target email's existing account (if any)
  │     │   If no account exists: guardian identity unknown — return 422:
  │     │     { error: "Cannot invite a minor without a known guardian. Invite their guardian first." }
  │     ├── Write AihApprovalRequest for each guardian with APPROVER+ level
  │     ├── emitAuditEvent(CHILD_ACTION_REQUESTED)
  │     └── Return 202 { approvalRequestId }
  │
  │   Guardian approves:
  │     ├── canApproveChildAction → allowed
  │     ├── Deserialize contextJson → { recipientEmail, trustUnitId, relationship }
  │     ├── Call lib/invite/index.ts createInvite(...)
  │     ├── Emit MEMBER_INVITED
  │     ├── Update AihApprovalRequest { state: approved }
  │     ├── emitAuditEvent(CHILD_ACTION_APPROVED)
  │     └── Return 200 InviteDTO
  │
  └── Guardian denies:
        ├── Update AihApprovalRequest { state: denied }
        ├── emitAuditEvent(CHILD_ACTION_DENIED)
        └── Return 200 ApprovalRequestDTO { state: "denied" }
```

**Key rule:** A minor invite **never creates an Invite record** until guardian approval is received.
The invite token is only minted after the guardian approves.

---

## Multiple Guardians Protocol

When a minor has multiple guardians with `APPROVER+` permission:

1. An `AihApprovalRequest` is created for each guardian.
2. All requests share the same `contextJson` snapshot.
3. **First-write-wins:** whichever guardian responds first (approve or deny) resolves the action.
4. Remaining open requests are set to `REVOKED` immediately after the first resolution.
5. `emitAuditEvent(APPROVAL_EXPIRED)` is NOT emitted for the revoked duplicates — only for genuine time-based expiry.

---

## Audit Emission Checklist per Flow

| Flow | Events emitted |
|---|---|
| Child account creation (success) | `GUARDIAN_RELATIONSHIP_ESTABLISHED` |
| Child account creation (denied) | `GOVERNANCE_DENIED` |
| Teen join trust unit (escalated) | `CHILD_ACTION_REQUESTED` |
| Teen join resolved (approved) | `CHILD_ACTION_APPROVED` + `MEMBER_JOINED` |
| Teen join resolved (denied) | `CHILD_ACTION_DENIED` |
| Teen join expired | `APPROVAL_EXPIRED` |
| Child content (escalated) | `CHILD_ACTION_REQUESTED` |
| Child content resolved (approved) | `CHILD_ACTION_APPROVED` + `CONTENT_POSTED` |
| Child content resolved (denied) | `CHILD_ACTION_DENIED` |
| Adult invites minor (escalated) | `CHILD_ACTION_REQUESTED` |
| Guardian approves minor invite | `CHILD_ACTION_APPROVED` + `MEMBER_INVITED` |
| Guardian denies minor invite | `CHILD_ACTION_DENIED` |
