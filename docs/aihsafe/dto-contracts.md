# AIH Safe — DTO Contracts
**AIH Safe API Contract Architect — contracts only. No live routes or persistence.**
**Agent 2.75 · 2026-05-09**

All DTOs are defined in `types/aihsafe/dto.ts` (request shapes) and
`types/aihsafe/api-responses.ts` (response shapes). This doc describes them in prose.

Zod schemas are NOT defined here — they are Agent 3's responsibility. This doc defines
the field-level contracts that Zod schemas must enforce.

---

## Request DTOs

### `CreateFamilyUnitRequest`

```
name          string, 1–80 chars, required
memberIds?    string[], min 1, optional — pre-add members at creation time
```

**Governance:** `canCreateTrustUnit(actor, { kind: "family" })`. Actor must be ADULT tier.

---

### `CreateTrustUnitRequest`

```
kind          "family" | "peer" | "extended" | "guardian", required
name?         string, 1–80 chars, optional display name
memberIds?    string[], pre-add members
defaultVisibilityScope?  VisibilityScope, defaults to "trust_unit"
maxMemberCount?          number, 3–100, defaults to 3
```

**Governance:** `canCreateTrustUnit(actor, { kind })`. Minors hard-denied.

---

### `InviteMemberRequest`

```
trustUnitId?    string (TrustUnitId), required if inviting to a trust unit
familyUnitId?   string (FamilyUnitId), required if inviting to a family unit
recipientEmail  string, email format, required
relationship    "parent"|"child"|"sibling"|"spouse"|"so"|"frnd"|"other", required
targetAgeTier?  "child"|"preteen"|"teen"|"adult"|"elder" — caller hint for governance
```

At least one of `trustUnitId` or `familyUnitId` must be present.

**Governance:** `canInviteToTrustUnit(actor, { targetAgeTier })`.
If `targetAgeTier` is a minor tier → response will carry `requiredApproval: true` + `approvalRequestId`.

---

### `CreateGuardianLinkRequest`

```
childUserId       string (UserId), required
kind              "parent"|"grandparent"|"legal_guardian"|"trusted_adult", required
permissionLevel   "view_only"|"approver"|"full_control", required
```

**Governance:** Actor must be ADULT. `canCreateChildAccount` gate is used to verify actor
has standing to link. Only the guardian-side user can initiate.

---

### `UpdateGuardianLinkRequest`

```
permissionLevel   "view_only"|"approver"|"full_control", required
```

Partial update — only permission level is mutable after establishment.

---

### `JoinTrustUnitRequest`

```
trustUnitId   string (TrustUnitId), required
```

**Governance:** `canJoinTrustUnit`. Teen → escalates. Child/Preteen → hard denied.

---

### `ManageMembershipRequest`

```
membershipId  string (MembershipId), required (in URL params)
role?         "creator"|"member"|"moderator" — optional role change
action        "exit" | "remove" | "promote" | "demote", required
```

**Governance:** `canManageMembership`. Only creator/moderator can remove others.

---

### `ApproveRequestBody`

```
note?   string, 0–500 chars, optional guardian note
```

No other fields — the approval request context is already stored in `AihApprovalRequest.contextJson`.

---

### `DenyRequestBody`

```
reason?   string, 0–500 chars, optional denial reason shown to minor
```

---

### `PostContentRequest`

```
trustUnitId?      string (TrustUnitId), target unit
familyUnitId?     string (FamilyUnitId), target family unit
visibilityScope   VisibilityScope, required
body              string, 1–5000 chars, required (text content)
mediaUrls?        string[], Phase 4 — URLs from storage upload (pre-signed)
```

**Governance:** `canPostContent`. Child/preteen → escalates.

---

### `UpdateVisibilityScopeRequest`

```
contentId       string (ContentId), required (in URL params)
visibilityScope VisibilityScope, required
```

**Governance:** Caller must be content owner. Scope must satisfy `isScopeAllowedForAgeTier`.
No escalation — downgrading scope is always allowed. Upgrading to a scope above actor's tier is denied.

---

### `CheckVisibilityRequest`

```
contentOwnerId    string (UserId), required
visibilityScope   VisibilityScope, required
trustUnitId?      string (TrustUnitId)
familyUnitId?     string (FamilyUnitId)
```

Returns a `GovernanceDecisionDTO` — the caller uses this for client-side gating before rendering.

---

### `ExpandTrustRequest`

```
targetUserId   string (UserId), required — user to expand trust toward
trustUnitId    string (TrustUnitId), required — unit to add target to
```

**Governance:** `canExpandTrust`. Adults only.

---

## Response DTOs

### `FamilyUnitDTO`

```
id              string (FamilyUnitId)
name            string
status          "active" | "dissolved"
createdByUserId string (UserId)
createdAt       string (ISO 8601)
dissolvedAt     string | null
members         FamilyUnitMemberDTO[]
```

### `FamilyUnitMemberDTO`

```
id           string (MembershipId)
userId       string (UserId)
displayName  string (firstName + lastName)
role         "guardian" | "child" | "adult"
joinedAt     string (ISO 8601)
exitedAt     string | null
```

---

### `TrustUnitDTO`

```
id                     string (TrustUnitId)
kind                   TrustUnitKind
status                 "active" | "dissolved"
defaultVisibilityScope VisibilityScope
maxMemberCount         number
createdAt              string (ISO 8601)
dissolvedAt            string | null
members                TrustUnitMemberDTO[]
```

### `TrustUnitMemberDTO`

```
id          string (MembershipId)
userId      string (UserId)
displayName string
role        "creator" | "member" | "moderator"
joinedAt    string (ISO 8601)
exitedAt    string | null
```

---

### `GuardianLinkDTO`

```
id              string (GuardianRelationshipId)
guardianUserId  string (UserId)
guardianName    string
childUserId     string (UserId)
childName       string
kind            "parent"|"grandparent"|"legal_guardian"|"trusted_adult"
permissionLevel "view_only"|"approver"|"full_control"
establishedAt   string (ISO 8601)
revokedAt       string | null
```

---

### `InviteDTO`

```
id             string (InviteId)
recipientEmail string
status         AIHInviteState
relationship   string
trustUnitId?   string (TrustUnitId)
familyUnitId?  string (FamilyUnitId)
expiresAt      string (ISO 8601)
createdAt      string (ISO 8601)
```

---

### `ApprovalRequestDTO`

```
id            string (ApprovalRequestId)
requestorId   string (UserId)
requestorName string
approverId    string (UserId)
actionKind    string (AuditEventKind)
state         "pending"|"approved"|"denied"|"revoked"|"expired"
expiresAt     string (ISO 8601)
resolvedAt    string | null
createdAt     string (ISO 8601)
```

Note: `contextJson` is NEVER exposed in the response DTO — it is internal to the approval resolution flow.

---

### `GovernanceDecisionDTO`

```
allowed          boolean
reasonCode       ReasonCode
reason           string
requiredApproval boolean     (false when field absent)
approvalRequestId? string    (present only when requiredApproval = true and request was created)
```

This is attached to mutation responses where the governance decision is part of the answer.
It is also the standalone response body for `POST /api/aihsafe/visibility/check`.

---

### `AuditEventDTO`

```
id        string (AuditEventId)
kind      string (AuditEventKind)
actorId   string
targetId  string | null
meta      Record<string, unknown>
createdAt string (ISO 8601)
```

---

## Field Conventions

| Convention | Rule |
|---|---|
| All dates | ISO 8601 strings (`toISOString()`) — never Unix timestamps |
| Nullable fields | Always present in response body with explicit `null` (never `undefined`) |
| Branded IDs | Serialized as plain `string` in JSON — brands are TypeScript-only |
| `displayName` | Always `firstName + " " + lastName` from the User record — never expose raw email in member DTOs |
| `meta` fields | Always `Record<string, unknown>` — keys are stable per `AuditEventKind` |
| Empty arrays | `[]` not `null` |
| Boolean flags | Never strings ("true"/"false") — always `true`/`false` |
