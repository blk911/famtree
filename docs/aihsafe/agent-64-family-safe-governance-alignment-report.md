# Agent 64 — Family Safe Governance Console Alignment

**Branch:** `aihsafe-agent-64-family-safe-governance-alignment`  
**Date:** 2026-05-19  
**Scope:** Architecture + UX alignment pass. No Dashboard redesign. No new governance systems. No Prisma schema changes. No discovery/open DMs.

---

## Executive summary

The **governance engine** is globally active (`lib/aihsafe/governance/`, `lib/aihsafe/policy/`, founder settings, approvals, Msg Vault overlays). The **control surface** is concentrated at `/aihsafe` (`FounderShell`) but naming, tab semantics, and a few dead/orphan UI pieces blur the boundary with Msg Vault and the platform admin audit log.

**Target mental model (confirmed and documented):**

| Surface | Role |
|---|---|
| **Dashboard** (`/dashboard`) | Daily communication + awareness — family feed, private-thread entry, invites, trust-unit gate cards |
| **Msg Vault** (`/msg-vault`) | Governed communication — chats, threads, notices, governance overlays on conversations |
| **Family Safe** (`/aihsafe`) | Policy + authority + oversight — founder settings, spaces/structure, people/guardians, approvals, governed activity review |

Sidebar already separates **Msg Vault** and **Family Safe** (`AppSidebar.tsx`). Page metadata is correct (`Family Safe · AMIHUMAN.NET`). Remaining confusion is mostly **internal tab labels** (Activity vs audit log) and **legacy dead components** (unused founder panels).

---

## 1. Current Family Safe nav hierarchy

### Route

- Single app route: `app/(app)/aihsafe/page.tsx` → `FounderShell` (all roles).
- Shell mode from `deriveShellMode()` (`components/aihsafe/roles/shellMode.ts`): `founder` | `member` | `child` (UI only; APIs enforce auth).

### Tabs (`components/aihsafe/navigation/FamilySafeTabs.tsx`)

| Tab ID | Label (after Agent 64) | Primary content |
|---|---|---|
| `overview` | Overview | Role-specific command center: pending counts, health, next actions, child escalation status |
| `spaces` | Spaces | Family units + trust units; create/manage (founder); read-only approved circles (child) |
| `activity` | Activity | Governed **AIH activity posts** (`ActivityFeed` → `GET /api/aihsafe/activity`) — not platform audit log |
| `members` | Members | `PeopleTab` — guardians, supervised minors, family/network roster, pending AIH invites |
| `approvals` | Approvals | `PendingAttention` (founder) or `GuardianInbox` (guardian member) |
| `settings` | Policies & Settings | `FounderSettingsEditor` (founder shell only) |

### Tab visibility (`getVisibleTabs`)

| Shell | Tabs |
|---|---|
| `founder` (system `founder` \| `admin`) | All six |
| `member` + guardian link | overview, spaces, activity, members, approvals |
| `member` (non-guardian adult) | overview, spaces, activity, members |
| `child` (minor tiers: child, preteen, **teen**) | spaces, activity only |

### What belongs in Family Safe

- Founder / policy toggles (`FounderSettingsEditor`)
- Trust-unit and family-unit structure (`SpacesTab`, create modals)
- Guardian relationships (read in Members; create via API)
- Approval queue and pending AIH invites
- Governed space activity feed (oversight + minor posting within policy)
- Escalation status for minors (`ChildEscalationStatus` on child overview)

### What should NOT live here (or only as deep links)

- **Primary daily family broadcast feed** → Dashboard Posts tab
- **Direct / thread messaging UI** → Msg Vault (Dashboard private threads deep-link to same Msg Vault APIs)
- **Platform-wide famtree admin** (member suspend, waitlist, site activity log) → `/admin/*` under Settings accordion
- **Open discovery / stranger DMs** → explicitly out of scope (not built)

### Naming / order assessment

| Persona | Assessment |
|---|---|
| **Founder** | Order is workable; **Activity** is easily confused with **Settings → Activity Log** (`/admin/activity`). **Policies & Settings** label (Agent 64) clarifies the last tab. Optional future reorder: Overview → Spaces → Members → Approvals → Activity → Policies & Settings. |
| **Parent / guardian** | Approvals + Members placement is correct. Overview as inbox summary works. No Settings tab (expected). |
| **Business steward** | No separate shell mode; stewards are either **founder/admin** (full console) or **adult member** with trust-unit create rights only when `shellMode === "founder"`. Business trust units are managed under Spaces like family units. |
| **Teen** | Routed to `child` shell (minor tier) — only Spaces + Activity; aligns with supervised participation, not governance. |

---

## 2. Governance-console model

Family Safe is the **canonical governance console** when described as four surfaces:

| Surface | Family Safe manifestation |
|---|---|
| **Authority** | Founder-only: create family/trust units, invites, steward banner, `FounderSettingsEditor`, approval decisions |
| **Policy** | `PATCH /api/aihsafe/founder-settings`, category allowlist panel (localStorage today), visibility defaults, minor flags, private-thread flag |
| **Oversight** | Overview metrics, `ActivityFeed` with trust-unit scope, `PendingAttention`, guardian inbox, `ChildEscalationStatus` |
| **Escalation** | Approvals tab, `GET /api/aihsafe/escalations/mine`, approval API, Msg Vault notices (consumer) |

**NOT:**

- Daily feed (Dashboard)
- Social dashboard (no likes ranking / discovery)
- Communication stream (Msg Vault)

---

## 3. Founder control placement audit

| Control | Backend | Family Safe UI | Status |
|---|---|---|---|
| Founder settings | `GET/PATCH /api/aihsafe/founder-settings` | Policies & Settings tab | **Wired** |
| Guardian links | `GET/POST /api/aihsafe/guardian-links` | Members tab (read-only lists) | **Partially exposed** — no create/revoke form; `TrustedExtensionsPanel` exists but **unused** |
| Trust-unit governance | `POST /api/aihsafe/trust-units`, memberships APIs | Spaces tab + modals | **Wired** (founder create) |
| Family units | `POST /api/aihsafe/family` | Spaces / quick create | **Wired** |
| Approvals | `GET/PATCH /api/aihsafe/approvals` | Approvals tab | **Wired** |
| AIH invites | `GET/POST /api/aihsafe/invites` | Overview, Members, modals | **Wired** |
| Audit activity (platform) | `GET /api/admin/activity` | — | **Hidden from Family Safe** — `/admin/activity` via Settings submenu (founder/admin site role) |
| Escalation review | Approvals + escalations routes | Approvals + child status | **Wired** (post-content escalation to approval queue still a **policy gap** per Agent 44) |
| Visibility rules | Founder settings `defaultVisibilityScope` | Policies & Settings | **Wired** |
| Private-thread policies | `enablePrivateThreads` in founder settings | Policies & Settings toggle | **Partially exposed** — flag exists; enforcement/trust-unit kind gap per policy matrix |
| Policy profiles / limits | `lib/aihsafe/policy/`, limits engine | Not a dedicated tab; enforced in APIs | **Hidden** (by design — no raw profile editor in UI) |
| `canMessage` / messaging policy | Governance kernel + Msg Vault routes | Msg Vault context rail overlay | **Duplicated surface** — enforcement in Vault; policy source in Family Safe settings |

### Duplicated elsewhere

| Feature | Also appears in |
|---|---|
| Invites | Sidebar `/invite`, Dashboard Invites tab, Admin invites table |
| Trust-unit formation approvals | Dashboard `DashboardTrustUnitGate` / `TrustRequestsPanel` (legacy tree trust gate) |
| Private threads | Dashboard Private Threads hub (Msg Vault API-backed) + Msg Vault Threads tab |
| Governed posts | Dashboard family feed (`Post` model) vs Family Safe `ActivityPost` (`/api/aihsafe/activity`) — **two post systems** |

### Dead / orphan UI (not rendered)

- `GovernanceOverview.tsx` — removed from Overview in Agent 29; file remains
- `RelationshipVisibilityCard.tsx` — replaced by `PeopleTab` in Agent 27; file remains
- `TrustedExtensionsPanel.tsx` — same; documented `onAddClick` never wired
- `AihSafeShell.tsx` — unused; hero copy still says **Msg Vault** (misleading if revived)

---

## 4. Dashboard separation audit

Dashboard (`DashboardMemberLayout`) today:

- **Posts** — famtree `Post` feed (`dashboardFeedWhere`)
- **Private Threads** — Msg Vault conversation APIs (Agent 59–63 convergence)
- **Invites** — sent invite list
- **CTA strip** — deep links to tabs + `/msg-vault` for notices

**Appropriate on Dashboard (operational / awareness):**

- Activity counts, unread hints, invite status
- Trust-unit gate approval cards (member-facing action)
- Profile completion, identity acks

**Governance leakage (consider moving awareness, not ripping out):**

| Item | Recommendation |
|---|---|
| Trust-unit gate approvals | Keep short-term on Dashboard (operational task); long-term link to Family Safe Approvals or Msg Vault Notices |
| `vaultNotificationCount` heuristic | Counts trust/approval-ish signals; label on Dashboard CTA says "governance notices" but routes to **Msg Vault** — acceptable as **awareness → vault** handoff |
| No founder settings on Dashboard | **Good** — settings only in Family Safe |

**Do NOT move to Family Safe:** main family post composer, thread message UI, tree browsing.

---

## 5. Msg Vault relationship audit

| Concern | Owner |
|---|---|
| Send/receive messages | Msg Vault (`MsgVaultShell`, `/api/msg-vault/*`) |
| Conversation list, notices, context rail | Msg Vault |
| `GovernanceOverlayDTO`, relationship context | Msg Vault UI; data from policy + graph services |
| Who may message whom | `canMessage()` kernel + route gates; configured via Family Safe founder settings + guardian graph |
| Founder policy toggles | Family Safe Policies & Settings |
| Approval of minor actions | Family Safe Approvals (+ notices in Vault) |

**Interaction boundaries:**

1. User configures policy in **Family Safe** → persisted in `AihFounderSettings` / profiles → resolved on each API call.
2. User communicates in **Msg Vault** → enforcement at message/conversation routes.
3. User sees "what's new" on **Dashboard** → cards link into Vault or Family Safe, not duplicate governance editors.

Reference: `docs/msg-vault/msg-vault-architecture.md`, `docs/msg-vault/governance-rules.md`.

---

## 6. Recommended Family Safe nav structure

### Implemented (Agent 64 — label only)

- Settings tab → **Policies & Settings**
- Tab list `aria-label` → **Family Safe navigation** (was incorrectly "Msg Vault navigation")

### Recommended (documentation / future agents — no code in this pass)

**Target order (founder):**

1. Overview  
2. Spaces  
3. Members  
4. Approvals  
5. Activity *(optional rename: **Governed activity**)*  
6. Policies & Settings  

**Rationale:** Put authority workflows (members, approvals) before the consumption-oriented activity feed; keep policies last as infrequent configuration.

**Optional founder Overview link:** "Platform activity log →" to `/admin/activity` (site admin audit), distinct from Family Safe Activity tab.

**Do not add** Tools & Foundation to Family Safe — remains under Settings accordion (`/admin/tools`) for site operators.

---

## 7. Role-based visibility matrix

| Tab / capability | Founder/Admin | Guardian (adult) | Adult member | Teen/Child (minor) |
|---|---|---|---|---|
| Overview | Yes | Yes | Yes | No (child lands on Spaces) |
| Spaces | Yes (create) | Yes (view/leave) | Yes (view/leave) | Yes (read-only approved) |
| Activity | Yes (+ composer rules by tier) | Yes | Yes | Yes (restricted composer) |
| Members | Yes | Yes | Yes | No |
| Approvals | Yes | Yes (inbox) | No | No |
| Policies & Settings | Yes | No | No | No |
| Quick create (space/family/invite) | Yes | No | No | No |
| Platform Activity Log (`/admin/activity`) | Yes (sidebar) | No | No | No |

**Age note:** `TEEN` uses `child` shell (same tabs as child/preteen). System role `admin` uses `founder` shell (same as founder).

**Security note:** Tab hiding is UX only; all mutations require API auth + governance checks.

---

## 8. Dashboard vs Msg Vault vs Family Safe — responsibility split

```
┌─────────────────────────────────────────────────────────────────┐
│                        AMIHUMAN.NET member                       │
├──────────────┬──────────────────────┬───────────────────────────┤
│  Dashboard   │      Msg Vault        │      Family Safe          │
│  awareness   │   communication       │   governance console      │
├──────────────┼──────────────────────┼───────────────────────────┤
│ Family feed  │ Direct chats          │ Founder settings          │
│ Private      │ Trust threads         │ Spaces / trust units      │
│   thread hub │ Notices               │ Members / guardians       │
│ Invite CTAs  │ Policy overlays (read)│ Approvals / escalations   │
│ TU gate cards│                       │ Governed activity feed    │
└──────────────┴──────────────────────┴───────────────────────────┘
         │                 │                         │
         └─────────────────┴─────────────────────────┘
                    lib/aihsafe/governance + policy
```

---

## 9. Recommended next steps

| Priority | Item |
|---|---|
| P1 | Add guardian-link create/revoke UI in Members (wire `TrustedExtensionsPanel` or inline form → `POST /api/aihsafe/guardian-links`) |
| P1 | Close post-escalation gap: minor posts → approval queue when `requireGuardianApprovalForMinors` (Agent 44) |
| P2 | Reorder founder tabs per §6; optionally rename Activity → Governed activity |
| P2 | Delete or archive unused components (`GovernanceOverview`, `RelationshipVisibilityCard`, `AihSafeShell` or fix branding) |
| P2 | Persist category allowlist to DB; enforce on activity POST |
| P3 | Dashboard TU gate: deep-link to Family Safe Approvals instead of duplicating logic |
| P3 | Unify "activity" language in UI: Family Safe feed vs `/admin/activity` audit log |
| P3 | `enablePrivateThreads` ↔ trust-unit kind + Msg Vault thread creation gate |

---

## 10. Files inspected

| Area | Paths |
|---|---|
| Route | `app/(app)/aihsafe/page.tsx` |
| Shell | `components/aihsafe/founder/FounderShell.tsx`, `VaultHero.tsx`, founder panels |
| Nav | `components/aihsafe/navigation/FamilySafeTabs.tsx` |
| Roles | `components/aihsafe/roles/shellMode.ts` |
| Tabs content | `components/aihsafe/spaces/SpacesTab.tsx`, `people/PeopleTab.tsx`, `feed/ActivityFeed.tsx`, `guardian/GuardianInbox.tsx`, `founder/FounderSettingsEditor.tsx`, `founder/PendingAttention.tsx` |
| APIs | `app/api/aihsafe/**` |
| Sidebar | `components/AppSidebar.tsx` |
| Dashboard | `app/(app)/dashboard/page.tsx`, `components/dashboard/DashboardMemberLayout.tsx`, `DashboardActivityCtaStrip.tsx`, `DashboardHubColumns.tsx` |
| Msg Vault | `app/(app)/msg-vault/page.tsx`, `components/msg-vault/MsgVaultShell.tsx`, `MsgVaultTabs.tsx` |
| Docs | `docs/aihsafe/agent-26-nav-qa-polish-report.md`, `agent-29-overview-tighten-report.md`, `agent-31-dashboard-vault-consolidation-report.md`, `policy-enforcement-matrix.md`, `founder-settings-flow.md`, `docs/msg-vault/msg-vault-architecture.md`, `governance-rules.md` |

---

## 11. Files modified (Agent 64)

| File | Change |
|---|---|
| `components/aihsafe/navigation/FamilySafeTabs.tsx` | Tab label `Settings` → `Policies & Settings`; `aria-label` `Family Safe navigation` |
| `docs/aihsafe/agent-64-family-safe-governance-alignment-report.md` | This report |

---

## 12. Validation results

| Command | Result |
|---|---|
| `npm run typecheck` | **Pass** |
| `npx next build` | **Pass** (after clearing stale `.next`; first attempt failed with `PageNotFoundError` for `/api/admin/members` — environment/cache issue, not Agent 64 changes) |
