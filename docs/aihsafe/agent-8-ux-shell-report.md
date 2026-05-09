# Agent 8 — UX Shell Report

**Branch:** `aihsafe-agent-8-ux-shell`
**Date:** 2026-05-09
**Scope:** Minimal governed UX shell for AIH Safe, composing existing API routes into React client components.

---

## Surfaces built

### Page
- `app/(app)/aihsafe/page.tsx` — server component, calls `requireAuth()`, passes `user.id` to `MembershipPanel`, composes all sections.

### Shared infrastructure
- `components/aihsafe/common/apiClient.ts` — typed fetch helpers with `AihResult<T>` discriminated union. Parses the normalized envelope: 202 → `AihEscalated`, 403 + `governance.reasonCode` → `AihDenied`, other non-ok → `AihError`, ok → `AihSuccess`.
- `components/aihsafe/common/DecisionNotice.tsx` — displays governance outcomes. 202 renders amber "Waiting for guardian approval" with approval ID. 403 renders red denial with human-readable copy keyed on `reasonCode`.
- `components/aihsafe/common/StatusCard.tsx` — `StatusCard` single-stat tile; `StatusDashboard` client component that fetches family count, trust unit count, and pending approvals count on mount.
- `components/aihsafe/common/AihSafeShell.tsx` — server-compatible page wrapper with hero header; `AihSection` sub-component for section cards.

### Panel components (all client components)
- `components/aihsafe/family/FamilyCreatePanel.tsx` — name input → POST /api/aihsafe/family. Lists family units with member count and status badge.
- `components/aihsafe/trust-unit/TrustUnitCreatePanel.tsx` — kind pill picker + optional name → POST /api/aihsafe/trust-units. Lists units with kind, member count, short ID.
- `components/aihsafe/invite/InvitePanel.tsx` — email, relationship, age tier hint, trust unit / family unit selectors (mutually exclusive) → POST /api/aihsafe/invites. Lists sent invites with status badge.
- `components/aihsafe/membership/MembershipPanel.tsx` — loads trust units, shows only units where `m.userId === currentUserId && !m.exitedAt`. "Leave space" → DELETE /api/aihsafe/memberships/:id. Last-member protection 409 surfaces as `AihDenied` notice.
- `components/aihsafe/guardian/GuardianInbox.tsx` — loads pending approvals, approve/deny per item → POST /api/aihsafe/approvals. Per-item busy/done/notice state. `actionLabel()` maps AuditEventKind strings to human text. `timeLeft()` shows expiry countdown.

### Navigation
- `components/AppSidebar.tsx` — "Family Safe" link added after Invite, using `ShieldCheck` icon. Active state covers `/aihsafe` and `/aihsafe/*`.

---

## API routes consumed

| Route | Method | Component |
|---|---|---|
| `/api/aihsafe/family` | GET | `StatusDashboard`, `FamilyCreatePanel` |
| `/api/aihsafe/family` | POST | `FamilyCreatePanel` |
| `/api/aihsafe/trust-units` | GET | `StatusDashboard`, `TrustUnitCreatePanel`, `MembershipPanel`, `InvitePanel` |
| `/api/aihsafe/trust-units` | POST | `TrustUnitCreatePanel` |
| `/api/aihsafe/invites` | GET | `InvitePanel` |
| `/api/aihsafe/invites` | POST | `InvitePanel` |
| `/api/aihsafe/memberships/:id` | DELETE | `MembershipPanel` |
| `/api/aihsafe/approvals` | GET | `StatusDashboard`, `GuardianInbox` |
| `/api/aihsafe/approvals` | POST | `GuardianInbox` |

---

## 202 / 403 handling

All mutations go through `apiClient.parseEnvelope`. The discriminated union is handled consistently:

- **`AihEscalated` (202):** `DecisionNotice` renders amber notice with approval request ID and expiry. User is informed that a guardian must approve before the action proceeds.
- **`AihDenied` (403):** `DecisionNotice` renders red notice with `REASON_COPY[reasonCode]` — stable, human-readable denial messages that do not expose internal governance logic.
- **`AihError` (network / 500):** inline error text near the form. Button re-enables so the user can retry.

---

## Intentionally not built

- **Feed / timeline** — no content consumption surface in this phase.
- **Open discovery** — no search, no suggested connections, no follower counts.
- **Vanity metrics** — no like counts, no follower counts, no post counts surfaced.
- **Promote/demote UI** — `TrustUnitMember` has no `role` column; governance always denies `canManageMembership`. Documented as Phase 4 schema gap.
- **Guardian link management** — guardian relationship CRUD is a separate surface, not in scope for this shell.
- **Post content** — PostContentRequest and content visibility endpoints not wired; Phase 3+.
- **Managed-remove** — guardian/creator can eventually remove members; blocked by same Phase 4 schema gap. No UI surface built.

---

## Design notes

Emotional model followed: "Parents experience governance (guardian inbox, approval notices). Kids experience ownership (their spaces, their invites, leave at any time)."

No `"use client"` on the shell or page — only leaf panels are client components. Server component passes `user.id` downward so `MembershipPanel` can identify the current user's row without an extra API call.
