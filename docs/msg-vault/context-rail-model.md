# Msg Vault — Context Rail Model

**Agent:** 48  
**Branch:** `aihsafe-agent-48-msg-vault-architecture`

The **context rail** is the right column in Msg Vault (same UX family as `DashboardContextRail` + `ContextRailCard`). It answers: *Who is this conversation with? Why can I see it? What governance applies? What needs my action?*

**Principles:**

1. **Dynamic** — content derives from active selection (chat, thread, space, notice).  
2. **Explainable** — always show `GovernanceOverlay` / visibility reason.  
3. **Action-oriented** — primary actions (approve, invite, open Family Safe) without leaving vault.  
4. **Role-filtered** — guardians see minor overlays; children never see other children’s guardian panels.

---

## Rail state machine

```
                    ┌─────────────┐
     no selection   │  DEFAULT    │  Overview shortcuts, pending counts
                    └──────┬──────┘
                           │
         select chat ──────┼────── select thread
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
       ┌─────────────┐           ┌─────────────┐
       │ DIRECT_CHAT │           │   THREAD    │
       └─────────────┘           └─────────────┘
              │                         │
              │    select space         │
              └────────────┬────────────┘
                           ▼
                    ┌─────────────┐
                    │   SPACE     │
                    └─────────────┘
                           │
              select notice ▼
                    ┌─────────────┐
                    │   NOTICE    │
                    └─────────────┘
```

Only **one** rail profile visible at a time. Mobile: rail collapses to bottom sheet.

---

## Shared components (conceptual)

| Block | Purpose |
|---|---|
| `RelationshipContext` | Avatars, names, edges (parent, TU moderator, CEO) |
| `GovernanceOverlay` | “You can see this because…” + policy source badge |
| `PendingActions` | Inline approve/deny or link to Notices |
| `LimitsStrip` | Posts/messages remaining today (from limits engine) |
| `TrustedAdults` | For child context — list guardians + approved adults |
| `QuickLinks` | Open in Family Safe, Tree, Space settings |

---

## Profile: DEFAULT (Overview / nothing selected)

**When:** Overview tab or empty selection.

| Section | Content |
|---|---|
| Pending summary | Unread chats, pending approvals, child escalations |
| Spaces snapshot | Top 3 active `MsgVaultSpace` with unread badges |
| People shortcuts | Recent 5 governed contacts (not search) |
| Policy nudge | “Complete date of birth” if UNKNOWN tier |

**Roles:** All (content filtered by role).

---

## Profile: DIRECT_CHAT — parent / child

**When:** 1:1 chat selected; one party is minor OR viewer is guardian of participant.

| Section | Content |
|---|---|
| Header | Child name + age tier badge (guardian view only) |
| Guardian visibility | “Guardian visibility enabled” + what is logged |
| Daily limits | Posts/messages remaining (`LimitsPolicy`) |
| Approved topics | Interest categories / allowed scopes (from `InterestsPolicy`) |
| Pending approvals | Child’s open `AihApprovalRequest` rows |
| Trusted adults | Guardians + `trusted_adult` links if enabled |
| Actions | “Open in Family Safe”, “View guardian inbox” |

**Child view:** Hide other child’s data; show only *your* limits and *your* pending requests.

**Adult ↔ adult:** Strip guardian blocks; show RelationshipContext + mutual spaces only.

---

## Profile: DIRECT_CHAT — business / org

**When:** Chat tagged with `AihVaultSpaceType.BUSINESS` or `DashboardSpace` BUSINESS.

| Section | Content |
|---|---|
| Role hierarchy | CEO → CFO → … (from org edges when available) |
| Confidentiality | Level label (Public internal / Confidential / Restricted) |
| Members | Space members with roles |
| External share policy | “External sharing disabled” default |
| Approval chain | Who must approve invites or new participants |
| Actions | Request approval, view audit record |

---

## Profile: THREAD — trusted / trust unit

**When:** Group or TU thread selected.

| Section | Content |
|---|---|
| Space badge | Name + `vaultSpaceType` chip |
| Member list | Participants + roles (moderator, member) |
| Visibility reason | e.g. “Shared trust unit: Soccer Crew” |
| Shared spaces | Other TUs overlapping same members |
| Recent notices | Last 5 thread-related notices (join, block, approval) |
| Thread actions | Mute, leave (if permitted), report to guardian |

**Child:** Show only **Approved Threads** metadata; if thread pending approval, show blocked state in main pane + rail “Waiting for parent approval”.

---

## Profile: SPACE

**When:** User selects a space from Spaces tab without a specific thread.

| Section | Content |
|---|---|
| Space hero | Name, type (FAMILY / BUSINESS / CHURCH / CLUB / PRIVATE) |
| Description | From `AihTrustUnitMeta.description` |
| Members | Full member list with presence (future) |
| Active threads | Subset with unread |
| Governance | `maxMemberCount`, default visibility scope |
| Founder flags | `enablePrivateThreads` effective status |

---

## Profile: NOTICE

**When:** User selects a row in Notices tab.

| Section | Content |
|---|---|
| Notice type | approval / invite / policy / membership |
| Summary | `contextSummary` text (reuse approvals helper) |
| Actors | Requestor, approver, expiresAt |
| Embedded context | Trust unit name, post snippet (80 chars) |
| Actions | Approve / Deny / Dismiss (type-dependent) |
| After resolve | Link to resulting thread or Vault Record |

---

## GovernanceOverlay (required fields)

Every rail profile includes an overlay object (API + UI):

```ts
interface GovernanceOverlay {
  visibilityReason: string;      // human sentence
  reasonCode?: string;           // kernel ReasonCode
  policySourceType?: string;     // founder_default | guardian_override | ...
  guardianOversightActive: boolean;
  externalSharingAllowed: boolean;
  escalationPending: boolean;
}
```

**Examples:**

- “You share trust unit **Soccer Crew** with Alex.”  
- “Guardian visibility is on for this chat (your parent can see activity).”  
- “External links are blocked for your account.”

---

## Dashboard rail migration

Today `DashboardContextRail` shows:

- Family tree preview → open private thread on dashboard  
- Trust units list  

**Target:**

- Dashboard rail **shrinks** to teaser + “Open Msg Vault”  
- Full People / Spaces context moves to Msg Vault rail  
- Deep links: `/msg-vault/chats?peer={userId}`

---

## Responsive behavior

| Breakpoint | Rail |
|---|---|
| Desktop | Fixed right column, ~280px |
| Tablet | Collapsible drawer |
| Mobile | Bottom sheet triggered by “Details” on conversation header |

---

## Data sources (read-only aggregation)

| Rail section | Source |
|---|---|
| Guardian visibility | `AihGuardianRelationship`, `ResolvedPolicyProfile` |
| Limits | `lib/aihsafe/limits`, `AihUsageCounter` |
| Approvals | `AihApprovalRequest`, `/api/aihsafe/escalations/mine` |
| Trust unit | `TrustUnit` + `AihTrustUnitMeta` |
| Members | `TrustUnitMember`, `AihFamilyUnitMember` |
| Audit | `AihAuditEvent` (Vault Records) |

Future: single `GET /api/msg-vault/context?conversationId=` BFF endpoint — **not in Agent 48 scope**.

---

## Accessibility

- Rail sections are landmark regions with headings.  
- Governance overlay text exposed to screen readers before message list.  
- Pending actions reachable by keyboard Tab order before composer.
