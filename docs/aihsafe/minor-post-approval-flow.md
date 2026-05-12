# AIH Safe — Minor Post Approval Flow

**Implemented by:** Agent 45

## Overview

When `requireGuardianApprovalForMinors=true` and the actor is CHILD or PRETEEN, posting content does not create a post immediately. Instead, an `AihApprovalRequest` is created per eligible guardian. The post is created only after a guardian approves it.

TEENs post directly (no escalation) — `escalation.requiresGuardianApprovalForPostContent` is false for TEEN tier.

---

## Who gets escalated

| AgeTier | `requiresGuardianApprovalForPostContent` | Result |
|---|---|---|
| CHILD | true (when setting enabled) | Escalated → 202 |
| PRETEEN | true (when setting enabled) | Escalated → 202 |
| TEEN | false (always) | Direct post → 201 |
| ADULT/ELDER | false | Direct post → 201 |
| UNKNOWN | false | Direct post → 201 (treated conservatively for scope, not escalation) |

`escalation.requiresGuardianApprovalForPostContent` comes from `buildDefaultPolicyProfile → escalationDefaults`.

---

## State machine

```
Child submits post
        │
        ▼
  allowMinorPosting?
  No  ──►  403 FORBIDDEN
  Yes ──►  canPostContent (scope gate)
              │
              ▼
        requiresGuardianApprovalForPostContent?
        No  ──►  AihActivityPost created → 201 Created
        Yes ──►  eligibleApprovers?
                    None  ──►  403 (no guardian with approval authority)
                    Found ──►  AihApprovalRequest(s) created
                               → 202 Accepted { approvalRequestId, expiresAt, actionKind }

Guardian sees request in inbox
        │
        ▼
  Guardian approves ──►  executeDeferredAction("create_activity_post")
                              - validate requestor still active
                              - validate trust unit membership (if scoped)
                              - AihActivityPost created (governanceState=allowed)
                              - VISIBILITY_CHANGED audit event emitted
        │
        ▼
  Guardian denies ──►  AihApprovalRequest.state=denied
                        No post created (ever)
```

---

## AihApprovalRequest shape

```json
{
  "actionKind": "activity.post_pending",
  "contextJson": {
    "action":          "create_activity_post",
    "bodyText":        "Going to the park today!",
    "visibilityScope": "family",
    "trustUnitId":     "cuid...",
    "familyUnitId":    null,
    "attachmentType":  null,
    "spaceName":       "Soccer Crew",
    "requestedAt":     "2026-05-11T14:30:00.000Z"
  }
}
```

`spaceName` is resolved from `AihTrustUnitMeta.name` at request-creation time and stored in contextJson so the guardian sees it without an extra DB join.

---

## Guardian inbox display

`buildContextSummary("activity.post_pending", contextJson)` produces:

| Context | Output |
|---|---|
| spaceName="Soccer Crew", bodyText present | `Post to "Soccer Crew": Going to the park today!` |
| no spaceName, bodyText present | `Post awaiting review: Going to the park today!` |
| no bodyText | `Post awaiting review` |

Body is truncated to 80 chars + `…` if longer.

---

## Executor validation

`executeDeferredAction` for `"create_activity_post"`:
1. Validates `requestor` still exists and is `active`
2. If `trustUnitId` set: validates requestor still has an active membership row
3. Creates `AihActivityPost` with `governanceState=allowed`, `escalationState=none`
4. Emits `VISIBILITY_CHANGED` audit event with `guardianApprovedBy` meta
5. Returns `{ ok: false, reason: "..." }` for validation failures (approval stays committed; post not created)

---

## Idempotency

The primary idempotency guard is the **atomic approval transition** in `POST /api/aihsafe/approvals`:
```sql
UPDATE aih_approval_requests SET state='approved' WHERE id=? AND state='pending'
-- count=0 → concurrent resolution → CONFLICT response returned
```
`executeDeferredAction` is called only when this transition succeeds (count > 0). The executor itself has no additional deduplication layer for posts (no `approvalRequestId` column on `AihActivityPost`). In the rare event of executor failure after the approval commits, the contextJson snapshot is preserved for manual replay.

---

## Child pending UI

`ChildEscalationStatus` (already built in Agent 43) polls `GET /api/aihsafe/escalations/mine?state=pending`. This endpoint returns all `AihApprovalRequest` rows where `requestorId=user.id`. Post escalations (`actionKind="activity.post_pending"`) appear automatically alongside other pending requests.

Each card shows:
- ⏳ "Waiting for guardian approval"
- contextSummary line (e.g., `Post to "Soccer Crew": Going to the park today!`)
- Time remaining before expiry

No UI changes were required — the existing escalation status component handles the new action kind transparently.

---

## Safety guarantees

- **Denied approval never creates post**: executor is only called on `action="approve"`
- **Already-resolved approval never creates post twice**: atomic state transition prevents double-approve
- **Sibling revocation still works**: approvals route revokes other pending requests for same `(requestorId, actionKind)` on approval
- **UNKNOWN age tier**: not escalated (treated as TEEN for policy; `requiresGuardianApprovalForPostContent=false`)
- **allowMinorPosting=false**: checked before escalation; returns 403, no approval request created
- **No guardian available**: returns 403 governanceDenied with `REQUIRES_GUARDIAN_APPROVAL` reason code
