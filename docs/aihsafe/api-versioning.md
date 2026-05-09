# AIH Safe — API Versioning
**AIH Safe API Contract Architect — contracts only. No live routes or persistence.**
**Agent 2.75 · 2026-05-09**

---

## Namespace Strategy

AIH Safe APIs live in a dedicated namespace: `/api/aihsafe/`.
This namespace itself acts as a version isolation boundary from the existing app routes.

### No URL version prefix at Phase 3

Phase 3 routes ship without a version segment:
```
/api/aihsafe/family
/api/aihsafe/approvals
```

Rationale: At Phase 3 there is only one consumer (the AIH Safe UI surfaces, also in this repo).
Internal monorepo APIs do not need URL versioning until external clients or mobile apps are added.

### Version prefix plan for Phase 5+ (external consumers)

When external callers are introduced, add a `v1` segment:
```
/api/aihsafe/v1/family
/api/aihsafe/v1/approvals
```

Phase 3 routes get a `/v1/` alias with no behavior change. Old `/api/aihsafe/` paths redirect to `/v1/`.
External clients pin to `/v1/`; internal UI switches at its own pace.

---

## Additive Evolution Rules

### Allowed without a version bump

- Adding new optional fields to response DTOs
- Adding new optional query params to GET endpoints
- Adding new optional fields to request bodies (Zod schemas mark them optional with defaults)
- Adding new route groups under `/api/aihsafe/`
- Adding new `AuditEventKind` values
- Adding new `ReasonCode` values
- Adding new `error.code` values

### Requires coordinated change (internal only, no version bump needed while single-consumer)

- Removing a field from a response DTO → update all UI consumers in the same PR
- Renaming a field → keep old field as alias for one release, then remove
- Changing the type of an existing field (e.g. `string` → `string[]`) → always a breaking change; requires version bump once external consumers exist
- Changing HTTP status for an existing condition

### Requires a new version (when external consumers exist)

- Removing a route
- Renaming a route path
- Changing required request body fields
- Changing the response envelope shape
- Removing a `ReasonCode` value the UI branches on
- Removing stable error codes

---

## Response Envelope Stability

The `transport-normalization.md` envelope shape is **frozen at Phase 3**:

```
{ ok, data, meta }            — success
{ ok, data, pending, governance, meta }  — 202 escalation
{ ok, error, governance?, meta }         — error
```

`ok`, `data`, `meta.requestId` are permanent. No field in this envelope may be removed.
New top-level fields may be added (e.g. `warnings`, `links`) without a version bump.

---

## Event Compatibility Rules

`AuditEventKind` values are append-only. Never removed.

Clients and downstream consumers must treat unknown `kind` values as no-ops.
Unknown kinds must not cause crashes or errors.

```ts
// Good — handles unknown gracefully
switch (event.kind) {
  case AuditEventKind.CONTENT_POSTED: ...
  default: break; // ignore unknown kinds
}

// Bad — crashes on new kinds
const handlers = { [AuditEventKind.CONTENT_POSTED]: () => {} };
handlers[event.kind](); // TypeError if kind is new
```

---

## ReasonCode Stability

`ReasonCode` values are append-only once published to a client.
The UI must `default:` handle any unknown `reasonCode` by showing a generic denial message.

**Never remove a ReasonCode** once it has shipped. Removing one breaks UI branches silently.

---

## DTO Field Deprecation Process

When a field must be removed from a response DTO (internal consumers only at Phase 3):

1. Mark the field as `@deprecated` in `types/aihsafe/dto.ts`
2. Search all UI consumers for references to the field
3. Update all consumers in the same PR as the DTO change
4. Remove the deprecated field from the DTO
5. Confirm `tsc --noEmit` passes before merge

There is no `deprecated` envelope marker in the JSON response (not needed for internal-only APIs).

---

## Governance Contract Stability

Governance function signatures (`canDoX(actor, target) → GovernanceDecision`) are frozen.
Adding a new governance function is allowed. Changing an existing function's input shape is a breaking change.

If a governance rule changes (e.g. teens are now allowed to do X without approval):
- Update `lib/aihsafe/governance/index.ts` in isolation
- The API route contract does not change — it still checks the gate
- The gate now returns `allowed: true` instead of `requiredApproval: true`
- No DTO change, no route change, no version bump needed

---

## Phase-Gated Rollout Plan

| Phase | Routes live | Versioning state |
|---|---|---|
| 3 | guardian-links, family, approvals, trust-units, memberships, invites, audit (stub) | No URL version — single internal consumer |
| 4 | content, visibility, full audit, notifications | No URL version — still single consumer |
| 5 | External mobile app or partner API | Add `/v1/` aliases; freeze envelope |
| 6+ | Breaking changes possible | Add `/v2/` if needed; deprecate `/v1/` on schedule |

---

## Internal Consistency Checks

Before any new route ships, verify:

1. The route appears in `api-topology.md`
2. All DTOs used appear in `dto-contracts.md` and `types/aihsafe/dto.ts`
3. The mutation appears in `mutation-boundaries.md` with a governance gate named
4. If the route escalates, the flow appears in `approval-flow-map.md`
5. All response shapes conform to the envelope in `transport-normalization.md`
6. `error.code` values are listed in `transport-normalization.md` §Standard Error Codes
