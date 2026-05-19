# Msg Vault — Governance Rules

**Agent:** 48  
**Branch:** `aihsafe-agent-48-msg-vault-architecture`

Hard rules for Msg Vault communication. These extend the existing **governance kernel** (`lib/aihsafe/governance/index.ts`) and **policy layer** (`lib/aihsafe/policy/`) — Agent 48 does **not** modify kernel code.

**Authority order (highest wins at enforcement time):**

1. Route handler gates (DB-backed checks)  
2. `ResolvedPolicyProfile` (founder + per-user profile)  
3. Governance kernel pure functions  
4. UI visibility (non-authoritative)

---

## 1. Relationship & discovery

### G1 — No stranger DMs

**Rule:** A user cannot open or send a direct conversation unless `canMessage()` returns `allowed: true`.

**Requires one of:** shared trust unit, guardian/child link, or active relationship edge (with minor restrictions below).

**UI:** People tab lists only governed contacts — no global username search.

### G2 — No open discovery

**Rule:** No directory of all network members, no “suggested friends,” no public handles.

**Exception:** Tree members visible per existing `isPublicInTree` + family scope rules on profile.

### G3 — Thread join requires membership path

**Rule:** Joining a group/thread requires invite, trust-unit membership, or guardian-approved escalation — never self-join by ID guess.

**Kernel:** Extend with `canJoinConversation(actor, conversationId)` mirroring `canJoinTrustUnit` patterns (future).

---

## 2. Age tier & minor protection

Derived from `deriveAgeTier()` / `isMinorTier()` — see Agent 46 fix (TEEN included in minor escalation for posts).

### G4 — Unknown age is conservative

| Concern | UNKNOWN behavior |
|---|---|
| Posting escalation | No guardian post queue (may post direct if otherwise allowed) |
| Visibility scopes | TEEN-equivalent (restricted scopes) |
| Messaging | **No edge-only DMs** for UNKNOWN minors; treat as unverified |
| Policy profile | `isMinor = false` for escalation flags — document gap; Msg Vault should **block sensitive comms** until DOB captured |

**Product recommendation:** Msg Vault **Chats** tab hidden or read-only until DOB onboarding complete (Family Safe onboarding).

### G5 — Child / teen contact requests escalate

**Rule:** When a minor initiates a **new** thread or adds a participant outside auto-approved set:

1. Create `AihApprovalRequest` (`actionKind`: e.g. `conversation.join_pending`)  
2. Return 202 to child  
3. Guardian approves → `executeDeferredAction` creates membership  

**Align with:** `activity.post_pending`, trust expansion escalation.

### G6 — Parent / guardian visibility

**Rule:** Guardians with `APPROVER` or `FULL_CONTROL` may:

- View metadata of minor conversations (participants, timestamps) — **content policy TBD by founder setting**  
- Receive notices for blocked sends and pending approvals  
- Not impersonate minor in chat without audit trail  

**UI:** Context rail “Guardian visibility enabled” (see `context-rail-model.md`).

### G7 — Minor messaging constraints (kernel today)

From `canMessage()`:

> Minors may only message users they share a trust unit with or have a guardian relationship with.

**Edge-only messaging denied for minors** even if adult could message via edge.

---

## 3. Spaces, trust units & org hierarchy

### G8 — Private threads founder flag

**Rule:** If `AihFounderSettings.enablePrivateThreads === false`:

- Deny **new** `Conversation` / trust-unit thread creation  
- Existing threads: read-only archive (recommended)  

**Today:** Flag persisted, not enforced on TU create (Agent 44 gap) — Msg Vault MVP must enforce.

### G9 — Trusted adults

**Rule:** If `enableTrustedAdults === false`, guardian link kind `trusted_adult` blocked (already on guardian-links route).

Msg Vault must not surface trusted-adult threads if link cannot exist.

### G10 — Business / org mode (CEO → CFO)

**Rule:** Organizational hierarchy is modeled as:

- `DashboardSpace` kind `BUSINESS` (existing)  
- `AihVaultSpaceType.BUSINESS` on trust unit meta  
- Future: `OrgRole` edge (CEO, CFO, reports-to) — **not in schema yet**

**Messaging rules:**

- Peers at same org level: require shared business space or explicit org edge  
- Skip-level (CEO → IC): allowed only if org policy permits; default **escalate to approver**  
- Confidentiality level on space caps export and attachment policies  

**UI:** Context rail shows role hierarchy + approval chain (business pod).

---

## 4. Content & sharing

### G11 — External sharing disabled by default

**Rule:** Messages cannot contain actionable external share links for minors when `allowMinorExternalLinks === false`.

**MVP:** Regex URL detection on send (same gap as activity posts — Agent 44 P4).

**Adults:** Off by default at founder level; per-space override later.

### G12 — No public attachments in MVP

Attachments governed by storage module + virus scan + size caps — **non-goal for MVP** (see build plan).

### G13 — Posts vs messages separation

**Rule:** Changing visibility on a Post does not retroactively change Conversation membership without explicit migration.

---

## 5. Approvals & notices

### G14 — Notices are not bypassable chat

Approval actions only through `POST /api/aihsafe/approvals` (or future msg-vault equivalent) — not by replying in thread.

### G15 — Idempotent approval execution

Same guarantees as Agent 45: atomic approval transition; deferred executor for side effects.

### G16 — Fan-out to guardians

Multi-guardian households: create one `AihApprovalRequest` per approver; first resolution revokes siblings.

---

## 6. Policy profile fields (messaging-relevant)

From `ResolvedPolicyProfile` / `FounderSettingsData`:

| Field | Msg Vault use |
|---|---|
| `allowMinorPosting` | If false, block message send for minors (parallel to posts) |
| `requireGuardianApprovalForMinors` | New thread / new participant escalation |
| `enablePrivateThreads` | Thread creation |
| `enableTrustedAdults` | Participant eligibility |
| `defaultVisibilityScope` | Default space for new space-bound threads |
| `limits.dailyPostLimit` | Consider `dailyMessageLimit` in future policy extension |

**Future type extension (planning only):**

```ts
interface MessagingPolicy {
  allowed: boolean;
  requiresGuardianApprovalForNewContact: boolean;
  dailyMessageLimit: number;
  allowAttachments: boolean;
  guardianCanViewContent: boolean;
}
```

Store in `AihPolicyProfile.messagingPolicy` JSON when schema agent runs.

---

## 7. Decision matrix (direct chat)

| Actor tier | Target | Shared TU | Guardian link | Edge only | Result |
|---|---|---|---|---|---|
| ADULT | ADULT | ✓ | — | — | Allow |
| ADULT | ADULT | — | — | ✓ | Allow |
| TEEN | ADULT | — | ✓ | — | Allow |
| TEEN | ADULT | — | — | ✓ | **Deny** |
| CHILD | cousin | ✓ | — | — | Allow if in TU |
| CHILD | stranger | — | — | — | **Deny** |
| UNKNOWN | ADULT | — | — | ✓ | Allow (kernel) — **Msg Vault should add DOB gate** |

---

## 8. Audit & records

Every deny / escalate / allow should emit `AihAuditEvent` with:

- `actorUserId`, `targetUserId` or `conversationId`  
- `reasonCode` from kernel  
- `policySourceType` snapshot  

Vault Records tab surfaces these for founders/guardians.

---

## 9. Explicit anti-patterns (governance)

| Forbidden | Enforcement |
|---|---|
| Open DM by email lookup | No API |
| Join thread by brute-force ID | 404 + rate limit |
| Minor → adult edge-only DM | `canMessage` deny |
| Bypass approval via dashboard post | Separate gates; align in migration |
| UI-only hiding of forbidden actions | API returns 403 |

---

## 10. References (code)

| Artifact | Location |
|---|---|
| `canMessage` | `lib/aihsafe/governance/index.ts` |
| `resolvePolicyProfile` | `lib/aihsafe/policy/resolvePolicyProfile.ts` |
| Founder settings | `app/api/aihsafe/founder-settings/route.ts` |
| Post escalation | `app/api/aihsafe/activity/route.ts`, `executeDeferredAction` |
| Shell modes | `components/aihsafe/roles/shellMode.ts` |
