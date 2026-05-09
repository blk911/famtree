# AIH Safe — Service Boundaries
**Agent 0 scaffold · Agent 1 Core Graph · Agent 2 Governance Kernel · Agent 3 Persistence + Graph · 2026-05-09**

---

## Boundary Rules

Each service has a defined **can read**, **can write**, and **must never** contract.
Violations require architect approval and a doc update before merge.

---

## 1 · Trust Graph Service (`lib/aihsafe/graph/`)

**Purpose:** Query and traverse the family trust network. Pure read — never enforces rules.

**Exported function signatures (Agent 3 — implemented):**

```ts
getTrustUnitById(id: TrustUnitId): Promise<TrustUnit | null>           // ✅ implemented
listTrustUnitsForUser(userId: AIHUserId): Promise<TrustUnit[]>         // ✅ implemented
listMembershipsForUser(userId: AIHUserId): Promise<TrustUnitMembership[]>  // ✅ implemented
listMembersForTrustUnit(trustUnitId: TrustUnitId): Promise<TrustUnitMembership[]>  // ✅ implemented
getGuardianRelationshipsForChild(childUserId: AIHUserId): Promise<GuardianRelationship[]>   // ✅ implemented
getGuardianRelationshipsForGuardian(guardianUserId: AIHUserId): Promise<GuardianRelationship[]>  // ✅ implemented
listRelationshipEdgesForUser(userId: AIHUserId): Promise<RelationshipEdge[]>  // ✅ Phase 3 proxy via ConnectionRequest
assertGraphShape(input: unknown): asserts input is GraphShapeInput      // ✅ implemented (unchanged)
```

**Phase 3 implementation notes:**
- `listRelationshipEdgesForUser` reads from `ConnectionRequest` as a proxy. Phase 4+ will add a dedicated `aih_relationship_edges` table.
- `TrustUnitMembership.role` defaults to `"member"` — existing `TrustUnitMember` has no `role` column.
- `TrustUnitMembership.exitedAt` defaults to `null` — existing `TrustUnitMember` has no `exitedAt` column.
- `TrustUnit.kind` is sourced from `AihTrustUnitMeta` sidecar (nullable → defaults to `"peer"`).

**Can read:** `User`, `TrustUnit`, `TrustUnitMember`, `AihTrustUnitMeta`, `AihGuardianRelationship`, `ConnectionRequest`.

**Can write:** Nothing.

**Must never:** Write to any Prisma model · Make permission decisions · Call external APIs.

---

## 2 · Guardian Governance Service (`lib/aihsafe/governance/`)

**Purpose:** Deterministic action gates. Single source of truth for all "can actor do X?" decisions.
All functions are **synchronous and side-effect-free**. Callers build contexts from graph data,
then inject them — the governance kernel never fetches data itself.

**Exported function signatures (Agent 2 — Governance Kernel):**

```ts
// Pure utilities
deriveAgeTier(dateOfBirth: Date | null): AgeTier
deriveFamilySafeRole(ageTier: AgeTier, guardianRelationships: GuardianRelationship[]): FamilySafeRole

// Action gates — all return GovernanceDecision
canCreateTrustUnit(actor: ActorContext, input: CreateTrustUnitInput): GovernanceDecision
canInviteToTrustUnit(actor: ActorContext, target: TargetContext): GovernanceDecision
canJoinTrustUnit(actor: ActorContext, target: TargetContext): GovernanceDecision
canApproveChildAction(actor: ActorContext, target: TargetContext): GovernanceDecision
canCreateChildAccount(actor: ActorContext, target: TargetContext): GovernanceDecision
canManageMembership(actor: ActorContext, target: TargetContext): GovernanceDecision
canPostContent(actor: ActorContext, target: TargetContext): GovernanceDecision
canComment(actor: ActorContext, target: TargetContext): GovernanceDecision
canMessage(actor: ActorContext, target: TargetContext): GovernanceDecision
canExpandTrust(actor: ActorContext, target: TargetContext): GovernanceDecision
```

**GovernanceDecision shape:**
```ts
{ allowed: boolean; reasonCode: ReasonCode; reason: string;
  requiredApproval?: boolean; auditEventType?: AuditEventKind }
```

**Rule summary:**
- Adults → permitted for most actions.
- Teens → permitted with guardian-approval escalation for sensitive actions (`requiredApproval: true`).
- Children/Preteens → hard deny OR escalate depending on action.
- Minors cannot send invites, manage memberships, or expand trust.
- Inviting/adding a minor always escalates to guardian approval.
- `canApproveChildAction` requires active guardian relationship with APPROVER or FULL_CONTROL level.
- Every governance denial or escalation carries an `auditEventType` for the caller to emit.

**Can read:** `ActorContext` (injected) — never calls Prisma or the graph service directly.

**Can write:** Nothing at this phase. Phase 2+ writes GuardianRelationship/FamilyUnit via Prisma.

**Must never:**
- Read `User.passwordHash` or credential fields.
- Write to any existing Prisma model.
- Fetch data from DB (caller's responsibility; governance receives pre-populated contexts).
- Make HTTP calls.

---

## 3 · Invite Service (`lib/aihsafe/invites/`)

**Purpose:** Wrap the existing invite system with AIH Safe guardian-consent lifecycle rules.

**Can read:** `Invite`, `InviteStatus`, `User` (senderId, role, invitedById), AIH Safe `GuardianRelationship` (Phase 1+).

**Can write:** Delegates all DB writes to existing `lib/invite/index.ts`.

**Must never:** Generate invite tokens · Bypass identity challenge · Create user accounts.

---

## 4 · Membership Service (future — `lib/aihsafe/membership/`)

**Status:** Not yet created. Stub defined in `types/aihsafe/membership.ts`.

---

## 5 · Visibility Service (`lib/aihsafe/visibility/`)

**Purpose:** Determine what content a viewer may see. All functions are **synchronous and
side-effect-free**. Callers populate ActorContext/TargetContext from graph data first.

**Exported function signatures (Agent 2 — Governance Kernel):**

```ts
canView(actor: ActorContext, target: TargetContext): GovernanceDecision
resolveMaxScope(actor: ActorContext): VisibilityScope
filterVisibleUsers(actor: ActorContext, candidates: AIHUserId[]): AIHUserId[]
isScopeAllowedForAgeTier(ageTier: AgeTier, scope: VisibilityScope): boolean
```

**Scope resolution rules:**
| Scope | Allowed when |
|---|---|
| `PRIVATE` | Actor is content owner |
| `GUARDIAN_ONLY` | Actor is owner OR active guardian of owner |
| `FAMILY` | `target.sharedFamilyUnitIds` is non-empty |
| `TRUST_UNIT` | `target.sharedTrustUnitIds` is non-empty |
| `EXTENDED_TRUST` | Any shared unit OR active relationship edge |
| `PUBLIC_APPROVED` | Actor's age tier includes this scope (adults only) |

**Can write:** Nothing. Pure resolver.

**Must never:** Cache decisions across requests · Expose child content without consulting guardian chain.

---

## 6 · Audit Event Service (`lib/aihsafe/audit/`)

**Purpose:** Create typed audit events. Persistence is now live (Phase 3).

**Exported function signatures (Agent 3 — implemented):**

```ts
createAuditEventDraft(input: CreateAuditEventInput): AuditEventDraft        // ✅ pure, unchanged
emitAuditEvent(input: CreateAuditEventInput): Promise<AuditEventEnvelope>   // ✅ writes to aih_audit_events
getAuditEventsForTarget(targetId: string, limit?: number): Promise<AuditEventEnvelope[]>  // ✅ queries aih_audit_events
```

**AuditEventDraft vs AuditEventEnvelope:**
- `AuditEventDraft` — pre-persistence; no id; has `_persistenceDeferred: true` marker. Returned by `createAuditEventDraft`.
- `AuditEventEnvelope` — post-persistence; has id; returned by `emitAuditEvent` and `getAuditEventsForTarget`.

**Phase 3 notes:**
- `emitAuditEvent` now writes to `aih_audit_events` via Prisma. Return type is `AuditEventEnvelope`.
- `actorId` and `targetId` stored as plain strings (no FK — legal hold requirement).
- `meta` cast to `Prisma.InputJsonValue` at the DB boundary; typed as `Record<string, unknown>` in AIH Safe types.

**Must never:** Delete audit events · Make governance decisions · Call other AIH Safe services directly.

---

## 7 · Notification Service (future — `lib/aihsafe/notifications/`)

**Status:** Not yet created.

**Must never:** Send email to a child's address without guardian awareness.

---

## 8 · Content / Media Service (future — `lib/aihsafe/content/`)

**Status:** Not yet created. Wraps `lib/storage/index.ts`.

---

## 9 · Family Unit Service (future — `lib/aihsafe/family/`)

**Status:** Not yet created. Depends on Phase 1 schema (`FamilyUnit` Prisma model).

---

## 10 · Team / Unit Service (future — `lib/aihsafe/team/`)

**Status:** Not yet created. Depends on Phase 1 schema.

---

## 11 · Actor Context Service (`lib/aihsafe/context/`) — Agent 3

**Purpose:** Assemble a fully-populated `ActorContext` for a given user ID.

**Exported function signatures (Agent 3 — implemented):**

```ts
buildActorContext(userId: AIHUserId): Promise<ActorContext>  // ✅ implemented
```

**Can read:** `User` (via Prisma directly — id, role, status, dateOfBirth only), plus delegates all graph reads to the graph service.

**Can write:** Nothing.

**Must never:** Make governance decisions · Return context for non-active users (throws) · Cache context across requests.

---

## 12 · Mapper Layer (`lib/aihsafe/mappers/`) — Agent 3

**Purpose:** Centralize all Prisma → AIH Safe DTO conversions and branded ID casts.

**Exported functions (Agent 3 — implemented):**

```ts
mapTrustUnit(row): TrustUnit
mapTrustUnitMembership(row): TrustUnitMembership
mapGuardianRelationship(row): GuardianRelationship
mapConnectionRequestToEdge(row): RelationshipEdge
mapAuditEvent(row): AuditEventEnvelope
```

**Can read:** Prisma record shapes only — no DB calls.

**Can write:** Nothing.

**Must never:** Call Prisma directly · Contain business logic · Make governance decisions.

---

## Cross-Service Rules

1. Services communicate through exported TypeScript interfaces — no direct Prisma calls across boundaries.
2. Every service that writes to the DB must emit a corresponding audit event via `emitAuditEvent()`.
3. No service may call another service's internal helpers — only the exported surface.
4. The governance service is the single source of truth for "can actor do X?" — no re-deriving.
5. The trust graph service is the single source of truth for "are these users in the same TrustUnit?".
6. Governance and visibility functions are synchronous — callers are responsible for pre-fetching.
7. `ChildId` and `AIHUserId`/`UserId` are different branded types — always cast to `string` when comparing across a branded boundary.
8. All Prisma → AIH Safe conversions go through `lib/aihsafe/mappers/` — no inline `as BrandedType` casts elsewhere.
9. `buildActorContext` is the standard entry point for context assembly in API routes — do not replicate its fetch logic inline.
