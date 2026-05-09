# AIH Safe — Event Topology
**Agent 2.5 · Schema/Persistence Architect · 2026-05-09**

Maps governance actions to their audit event kinds, approval request triggers, and notification signals.
This is the single source of truth for "what happens when action X is taken."

---

## Event Kinds (extends `AuditEventKind`)

Defined in `types/aihsafe/audit-events.ts`. Full list:

```
TRUST_UNIT_CREATED
TRUST_UNIT_DISSOLVED
MEMBER_INVITED
MEMBER_JOINED
MEMBER_EXITED
GUARDIAN_RELATIONSHIP_ESTABLISHED
GUARDIAN_RELATIONSHIP_REVOKED
CHILD_ACTION_REQUESTED        ← minor attempted gated action
CHILD_ACTION_APPROVED         ← guardian approved
CHILD_ACTION_DENIED           ← guardian denied
CHILD_ACCOUNT_CREATED
CONTENT_POSTED
CONTENT_SCOPE_CHANGED
COMMENT_POSTED
MESSAGE_SENT
TRUST_EXPANDED
APPROVAL_EXPIRED
GOVERNANCE_DENIED             ← hard deny (no escalation path)
```

---

## Governance Gate → Event Topology

| Governance function | Actor | Decision | Audit event | Approval request? |
|---|---|---|---|---|
| `canCreateTrustUnit` | Adult | `allowed` | `TRUST_UNIT_CREATED` | No |
| `canCreateTrustUnit` | Minor | `denied` | `GOVERNANCE_DENIED` | No |
| `canInviteToTrustUnit` | Adult, target is adult | `allowed` | `MEMBER_INVITED` | No |
| `canInviteToTrustUnit` | Adult, target is minor | `escalate` | `CHILD_ACTION_REQUESTED` | Yes — guardian of target |
| `canInviteToTrustUnit` | Minor | `denied` | `GOVERNANCE_DENIED` | No |
| `canJoinTrustUnit` | Adult | `allowed` | `MEMBER_JOINED` | No |
| `canJoinTrustUnit` | Teen | `escalate` | `CHILD_ACTION_REQUESTED` | Yes — guardian of teen |
| `canJoinTrustUnit` | Child/Preteen | `denied` | `GOVERNANCE_DENIED` | No |
| `canApproveChildAction` | Guardian (APPROVER+) | `allowed` | `CHILD_ACTION_APPROVED` | — (resolves existing) |
| `canApproveChildAction` | Non-guardian | `denied` | `GOVERNANCE_DENIED` | No |
| `canCreateChildAccount` | Adult | `allowed` | `CHILD_ACCOUNT_CREATED` | No |
| `canCreateChildAccount` | Minor | `denied` | `GOVERNANCE_DENIED` | No |
| `canManageMembership` | Creator/Moderator | `allowed` | `MEMBER_EXITED` (or relevant) | No |
| `canManageMembership` | Minor | `denied` | `GOVERNANCE_DENIED` | No |
| `canPostContent` | Adult | `allowed` | `CONTENT_POSTED` | No |
| `canPostContent` | Teen | `allowed` | `CONTENT_POSTED` | No |
| `canPostContent` | Child/Preteen | `escalate` | `CHILD_ACTION_REQUESTED` | Yes — guardian |
| `canComment` | Adult/Teen | `allowed` | `COMMENT_POSTED` | No |
| `canComment` | Child/Preteen | `escalate` | `CHILD_ACTION_REQUESTED` | Yes — guardian |
| `canMessage` | Adult/Teen | `allowed` | `MESSAGE_SENT` | No |
| `canMessage` | Child/Preteen | `escalate` | `CHILD_ACTION_REQUESTED` | Yes — guardian |
| `canExpandTrust` | Adult | `allowed` | `TRUST_EXPANDED` | No |
| `canExpandTrust` | Minor | `denied` | `GOVERNANCE_DENIED` | No |

---

## Approval Request Lifecycle

```
Minor attempts gated action
  │
  ├─→ governance returns { allowed: false, requiredApproval: true }
  │
  ├─→ Caller creates AihApprovalRequest { state: PENDING, expiresAt: now+48h }
  │
  ├─→ emitAuditEvent(CHILD_ACTION_REQUESTED)
  │
  ├─→ [Notification stub] Guardian notified (Phase 4)
  │
  └─→ Guardian responds:
        APPROVED → state: APPROVED, emitAuditEvent(CHILD_ACTION_APPROVED), action proceeds
        DENIED   → state: DENIED,   emitAuditEvent(CHILD_ACTION_DENIED),   action blocked
        No response within 48h → background sweep sets state: EXPIRED, emitAuditEvent(APPROVAL_EXPIRED)
```

---

## Audit Event Emission Rules

1. **Always emit on deny**: Every hard denial (`allowed: false, requiredApproval: false`) must emit `GOVERNANCE_DENIED`.
2. **Always emit on escalate**: Every escalation (`requiredApproval: true`) emits `CHILD_ACTION_REQUESTED` at request creation time.
3. **Always emit on resolve**: Both `CHILD_ACTION_APPROVED` and `CHILD_ACTION_DENIED` are emitted when a guardian resolves an approval request.
4. **Caller is responsible for emission**: The governance kernel returns `auditEventType` in `GovernanceDecision`. The API route calls `emitAuditEvent` with that type. The kernel never emits directly.
5. **emitAuditEvent is idempotent-safe**: The caller may retry — no unique constraint on `aih_audit_events`. Duplicate events are acceptable; missing events are not.

---

## Notification Signal Map (Phase 4+)

Events that should trigger user notifications (stubbed until notification service exists):

| Event | Recipient | Channel |
|---|---|---|
| `MEMBER_INVITED` | Invitee | Email |
| `CHILD_ACTION_REQUESTED` | Guardian(s) | Email + in-app |
| `CHILD_ACTION_APPROVED` | Minor (requestor) | In-app |
| `CHILD_ACTION_DENIED` | Minor (requestor) | In-app |
| `APPROVAL_EXPIRED` | Minor + Guardian | In-app |
| `GUARDIAN_RELATIONSHIP_ESTABLISHED` | Both parties | Email |
| `GUARDIAN_RELATIONSHIP_REVOKED` | Both parties | Email |
| `TRUST_EXPANDED` | All unit members | In-app |

**Constraint (from `service-boundaries.md` §7):** Must never send email to a child's address without guardian awareness. For minor notifications: send to guardian's email, surface in minor's in-app only.

---

## Background Jobs Required (Phase 3+)

| Job | Trigger | Action |
|---|---|---|
| Approval sweeper | Cron, every 15 min | Set `state: EXPIRED` on `aih_approval_requests` where `expiresAt < now()` and `state = 'pending'`; emit `APPROVAL_EXPIRED` |
| Audit archiver | Cron, daily | Move `aih_audit_events` older than 1 year to cold storage (Phase 5) |

No background jobs are implemented at Phase 2.5. This topology doc defines the intent.
