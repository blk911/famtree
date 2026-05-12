# Agent 45 — Minor Post Escalation Workflow

**Branch:** `aihsafe-agent-45-minor-post-escalation`  
**Status:** Complete

---

## 1. Files Modified

| File | Change |
|---|---|
| `types/aihsafe/audit-events.ts` | Added `ACTIVITY_POST_PENDING: "activity.post_pending"` |
| `lib/aihsafe/approvals/context-summary.ts` | Added `"activity.post_pending"` fallback + case |
| `lib/aihsafe/approvals/executeDeferredAction.ts` | Added `"create_activity_post"` case |
| `app/api/aihsafe/activity/route.ts` | Escalation branch in POST handler; new imports |

**No files from allowed list required changes** beyond the above supporting files:
- `app/api/aihsafe/approvals/route.ts` — already calls `executeDeferredAction` for any approved action ✅
- `app/api/aihsafe/escalations/mine/route.ts` — no actionKind filter; includes post requests automatically ✅
- `components/aihsafe/guardian/GuardianInbox.tsx` — renders `contextSummary` already ✅
- `components/aihsafe/child/ChildEscalationStatus.tsx` — renders pending requests generically ✅

---

## 2. Minor Post Escalation Behavior

**Trigger conditions** (ALL must be true):
- Actor is CHILD or PRETEEN (not TEEN, ADULT, ELDER, UNKNOWN)
- `allowMinorPosting = true` in founder settings (else 403 forbidden)
- `requireGuardianApprovalForMinors = true` in founder settings
- → `policy.escalation.requiresGuardianApprovalForPostContent = true`
- At least one guardian with `APPROVER` or `FULL_CONTROL` permission is linked

**Sequence:**
1. Limits gate (`checkPostLimits`) — 429 if hit
2. Build actor context
3. Resolve policy profile
4. Scope resolution (policy.visibility.defaultScope)
5. Governance gate (`canPostContent` — scope check)
6. Escalation check → select eligible guardian approvers
7. Look up `AihTrustUnitMeta.name` for contextSummary spaceName
8. Create one `AihApprovalRequest` per guardian (fan-out)
9. Emit `ACTIVITY_POST_PENDING` audit event
10. Return **202 Accepted** with `PendingEscalationDTO`

**No `AihActivityPost` row is created at step 10.**

---

## 3. Deferred Executor Behavior

New case `"create_activity_post"` in `executeDeferredAction`:

| Step | Action |
|---|---|
| 1 | Validate `requestorId` user still exists and `status=active` |
| 2 | If `trustUnitId` set: verify requestor still has a `TrustUnitMember` row |
| 3 | Create `AihActivityPost` with `governanceState=allowed`, `escalationState=none` |
| 4 | Emit `VISIBILITY_CHANGED` audit event with `guardianApprovedBy` meta |
| 5 | Return `{ ok: true }` |

Failure paths return `{ ok: false, reason }` without throwing. The approval state (`approved`) is already committed — only the post creation is skipped on failure.

---

## 4. Guardian Approval Behavior

No changes to `POST /api/aihsafe/approvals`. The existing handler:
1. Validates guardian identity and assignment
2. Performs atomic state transition to `"approved"`
3. Revokes sibling requests (multi-guardian fan-out handled)
4. Calls `executeDeferredAction(approvalRequest, guardianId)` — now handles `"create_activity_post"`
5. Emits `GUARDIAN_CONSENT_GIVEN` audit event

Guardian sees in their inbox (via `GuardianInbox` + `contextSummary`):
> **Post to "Soccer Crew"**: Going to the park today!  
> Requested by Alex · 71h left

---

## 5. Child Pending UI Behavior

`ChildEscalationStatus` (Agent 43) already polls `GET /api/aihsafe/escalations/mine?state=pending`, which returns all `AihApprovalRequest` rows for the child. Post escalations appear alongside space/invite requests with no UI changes.

contextSummary format:
- With space: `Post to "Soccer Crew": Going to the park today!`
- Without space: `Post awaiting review: Going to the park today!`
- Fallback: `Post awaiting review`

Body is sliced to 80 chars + `…` if longer.

---

## 6. Idempotency Handling

| Layer | Guard |
|---|---|
| Approval route | Atomic `updateMany({ where: { state: "pending" } })` — count=0 means already resolved |
| Executor | No duplicate post check (no `approvalRequestId` FK on `AihActivityPost` — would need schema change) |
| Sibling revocation | Approvals route revokes remaining `(requestorId, "activity.post_pending", state=pending)` rows on approval |

Primary idempotency is at the approval-transition layer. Executor is called at most once per approval request. In rare executor failure, the `contextJson` snapshot persists for manual replay.

---

## 7. Validation Results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx next build` | ✅ Build successful |
| Prisma schema unchanged | ✅ Confirmed |
| No new DB columns added | ✅ Confirmed |

---

## 8. Remaining Gaps

| Gap | Notes |
|---|---|
| TEEN escalation | TEENs post directly by design (`requiresGuardianApprovalForPostContent=false`). A future founder setting could opt-in TEENs to the same approval gate. |
| Executor idempotency | No `approvalRequestId` FK on `AihActivityPost`. Rare double-execution (e.g., guardian retries) would create a duplicate post. Mitigated by atomic approval-route transition. |
| Post expiry / revocation | If a child's approval request expires (72h TTL), the post is silently dropped with no notification to the child. A future agent should emit a notification. |
| Guardian notification | No push/email is sent when a post approval request is created. Guardian discovers it via polling the inbox. |
| Approved post not shown until reload | `ActivityFeed` is not told that a new post was created via guardian approval. Child would need to refresh the feed to see the approved post. |
