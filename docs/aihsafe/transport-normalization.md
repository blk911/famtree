# AIH Safe — Transport Normalization
**AIH Safe API Contract Architect — contracts only. No live routes or persistence.**
**Agent 2.75 · 2026-05-09**

Defines the standard API response envelope, error structure, pagination contract,
`reasonCode` propagation, and optimistic UI compatibility rules.

---

## Response Envelope

All AIH Safe API responses use a consistent envelope structure.

### Success (2xx)

```json
{
  "ok": true,
  "data": { ... },
  "meta": {
    "requestId": "req_abc123"
  }
}
```

- `ok` — always `true` for 2xx
- `data` — the primary resource or collection
- `meta.requestId` — echoes the `x-request-id` header for client-side correlation

### Accepted (202 — Escalation)

```json
{
  "ok": true,
  "data": null,
  "pending": {
    "approvalRequestId": "clx...",
    "expiresAt": "2026-05-11T12:00:00.000Z",
    "actionKind": "membership.granted"
  },
  "governance": {
    "allowed": false,
    "reasonCode": "REQUIRES_GUARDIAN_APPROVAL",
    "reason": "This action requires guardian approval.",
    "requiredApproval": true
  },
  "meta": {
    "requestId": "req_abc123"
  }
}
```

- `data` is `null` — the resource does not exist yet
- `pending` carries the approval request context for UI display
- `governance` surfaces the `GovernanceDecision` so the UI can react correctly

### Error (4xx / 5xx)

```json
{
  "ok": false,
  "error": {
    "message": "Human-readable description of the error.",
    "code": "DENIED_NOT_MEMBER",
    "status": 403
  },
  "governance": {
    "allowed": false,
    "reasonCode": "DENIED_NOT_MEMBER",
    "reason": "Actor does not share a trust unit with the content owner.",
    "requiredApproval": false
  },
  "meta": {
    "requestId": "req_abc123"
  }
}
```

- `error.message` — safe to display to the user
- `error.code` — stable machine-readable code; maps to `ReasonCode` for governance errors, or a generic code for infrastructure errors
- `governance` — present only when the error was a governance decision; absent for 400/500 errors
- `meta.requestId` — always present for debugging

---

## Standard Error Codes

Non-governance error codes (infrastructure, validation):

| `error.code` | HTTP status | Description |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Zod parse failure — `error.fields` array present |
| `NOT_AUTHENTICATED` | 401 | No valid session |
| `RATE_LIMITED` | 429 | Too many requests |
| `NOT_FOUND` | 404 | Resource does not exist or is not visible to actor |
| `CONFLICT` | 409 | Duplicate resource (unique constraint) |
| `ALREADY_RESOLVED` | 422 | Approval request is in a terminal state |
| `ESCALATION_PENDING` | 422 | Duplicate escalation already pending for this action |
| `INTERNAL_ERROR` | 500 | Unhandled server error |

### Validation Error Shape

```json
{
  "ok": false,
  "error": {
    "message": "Validation failed.",
    "code": "VALIDATION_ERROR",
    "status": 400,
    "fields": [
      { "path": "name", "message": "Name must be between 1 and 80 characters." }
    ]
  },
  "meta": { "requestId": "req_abc123" }
}
```

---

## ReasonCode Propagation

`ReasonCode` values from the governance kernel flow through to the API response unchanged.
The API route does NOT translate or rephrase governance reason codes.

Rules:
- `error.code` equals the `GovernanceDecision.reasonCode` for all governance-related errors
- `reason` from `GovernanceDecision` becomes `error.message` in the error envelope
- The UI must branch on `error.code` to show appropriate copy — not on `error.message` (which may change)
- The `governance` block is always the source of truth; `error.code` is a convenience echo of `reasonCode`

Stable ReasonCodes the UI must handle:
```
ALLOWED
DENIED_NOT_AUTHENTICATED
DENIED_MINOR_REQUIRES_GUARDIAN
DENIED_NOT_GUARDIAN
DENIED_NOT_MEMBER
DENIED_INSUFFICIENT_ROLE
DENIED_SCOPE_NOT_ALLOWED
DENIED_APPROVAL_REQUIRED
DENIED_TARGET_NOT_FOUND
DENIED_UNSUPPORTED_ACTION
REQUIRES_GUARDIAN_APPROVAL
REQUIRES_UNIT_ADMIN_APPROVAL
```

---

## Request Headers

All AIH Safe API requests must include:

| Header | Required | Description |
|---|---|---|
| `Cookie` | Yes | Session cookie (`AMIHUMAN.NET_session`) |
| `Content-Type: application/json` | Yes (mutations) | All POST/PATCH bodies are JSON |
| `x-request-id` | No | Client-assigned UUID for end-to-end tracing; echoed in response |

Response headers:

| Header | Always present | Description |
|---|---|---|
| `x-request-id` | Yes | Server-assigned or echoed from client |
| `Cache-Control: private, no-store` | Yes (mutations) | Prevent caching of mutation responses |
| `Cache-Control: private, max-age=0` | Yes (reads) | AIH Safe reads are personalized |

---

## Pagination Contract

List endpoints that may return many items use cursor-based pagination.

### Request query params

```
limit   number, 1–100, default 20
cursor  string, opaque cursor from previous response (absent = first page)
```

### Response shape

```json
{
  "ok": true,
  "data": {
    "items": [...],
    "pagination": {
      "cursor": "clx...",
      "hasMore": true,
      "total": null
    }
  },
  "meta": { "requestId": "req_abc123" }
}
```

- `cursor` — pass this as `?cursor=` in the next request; absent when `hasMore = false`
- `hasMore` — `true` if more pages exist
- `total` — `null` by default (count queries are expensive); populated only for admin views

**No offset pagination.** Cursor-only. The cursor is opaque to the client.

---

## Optimistic UI Compatibility Rules

These rules define what the API contract guarantees so the UI can safely apply optimistic updates.

### Rule 1 — Stable IDs before server confirmation
The client may generate a temp ID for display before the `201` response arrives.
The server response always includes the stable `id` field. The client must swap temp → stable on receipt.

### Rule 2 — 202 means "pending, not rejected"
A `202 Accepted` response is NOT an error. The UI must:
- Show the resource in a "pending approval" state (not an error state)
- Expose the `pending.approvalRequestId` so the user can check status later
- Never auto-retry a 202 — re-submission would create a duplicate escalation (→ 422)

### Rule 3 — Governance decisions are final for this request
A `403` with `governance.allowed = false` is a terminal decision for the current request.
The UI must NOT retry the same request automatically. The user must take a different action.

### Rule 4 — 409 Conflict means the resource already exists
The UI may re-fetch the existing resource rather than showing an error.

### Rule 5 — Fields in response are always complete
The server never returns partial DTOs. If a list item changes, the full updated DTO is returned.
The UI should replace (not merge) the local copy with the server response.

### Rule 6 — Audit events are server-side only
The client never assumes an audit event was emitted. Audit events have no client-observable effect.

---

## Content-Type Rules

- All request bodies: `application/json`
- All response bodies: `application/json`
- File uploads (Phase 4): multipart form data to a separate `/api/aihsafe/content/upload` endpoint
  that returns a pre-signed URL — the actual media is uploaded directly to Vercel Blob by the client.
  The `PostContentRequest` then references the Blob URL, not raw bytes.

---

## Idempotency Key (Phase 4+)

For critical mutations (approve, create guardian link), clients may send:
```
Idempotency-Key: <uuid>
```

The server stores the result for 24h and returns the cached response if the same key is re-sent.
This prevents double-submits on slow connections. Not implemented in Phase 3 — define the header
name here so routes can add it later without breaking clients.
