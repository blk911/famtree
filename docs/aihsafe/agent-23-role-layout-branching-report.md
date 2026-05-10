# Agent 23 — Complete Role-Based Layout Branching

**Branch:** `aihsafe-agent-23-role-layout-branching`
**Date:** 2026-05-10
**Scope:** Wire the existing `shellMode` prop to actually branch the Family Safe layout. No new APIs, no schema changes, no new features.

---

## 1. Files Modified

| File | Change |
|---|---|
| `components/aihsafe/founder/FounderShell.tsx` | Full layout branching on `shellMode`; new `HeroCard`, `ChildApprovedSpacesCard` internal components; imported `MembershipPanel` + `GuardianInbox` |

---

## 2. Founder Layout (`shellMode="founder"`)

Unchanged from before this agent. All governance panels visible.

**Hero:**
- "A governed network for your real people."
- "You are the steward of this family network."
- 4 stat cards: approvals waiting (amber when > 0), active spaces, trusted adults, pending invites (amber when > 0)

**Above grid:**
- `PendingAttention` — most prominent, shown only in this mode

**Center column:**
- "Family Activity" section header
- `ActivityFeed` (viewerMode="founder")
- `RelationshipVisibilityCard` below feed

**Right rail (top to bottom):**
1. `GovernanceOverview` — network-level stat tiles
2. `FamilyHealthPanel` — health indicators with urgency
3. Quick Actions card — all 3 buttons: Invite someone, New family group, New trusted space
4. `TrustedExtensionsPanel` — guardian link management
5. `FounderSettingsPreview` — governance settings
6. `FamilySnapshot` — family units list with create affordance
7. `SpacesSnapshot` — trust units grid with create affordance

---

## 3. Member Layout (`shellMode="member"`)

**Hero:**
- "Your trusted family spaces"
- "Share with the people who actually know you."
- 1 stat card: spaces you're in (only shown when loading is complete and mySpaces.length > 0)

**Above grid:**
- Nothing (PendingAttention suppressed)

**Center column:**
- "Family Activity" section header
- `ActivityFeed` (viewerMode="member")
- No `RelationshipVisibilityCard`

**Right rail:**
1. `GuardianInbox` card — shown only when `isGuardian` (user has at least one active non-revoked guardian link). Guardians who are not founders/admins still see their inbox.
2. "Your spaces" card — wraps `MembershipPanel` (shows memberships, "Leave space" button available)
3. "Quick Action" card — single "Invite someone" button only (no family group / space creation affordances)

**Hidden from member view:**
- GovernanceOverview, FamilyHealthPanel, TrustedExtensionsPanel, FounderSettingsPreview, FamilySnapshot, SpacesSnapshot, PendingAttention

---

## 4. Child Layout (`shellMode="child"`)

**Hero:**
- "Your safe family space"
- "Share updates with your trusted circles — only people approved by your family can see them."
- No stat cards

**Above grid:**
- Nothing

**Center column:**
- "Your Family Feed" section header (warmer label)
- `ActivityFeed` (viewerMode="child") — child-safe composer copy, no governance affordances

**Right rail:**
- `ChildApprovedSpacesCard` (inline component) — read-only list of spaces the child is a member of. Shows space name, kind icon (🏠/⚽/🌿/🛡), and member count. No "Leave space" button. If not in any spaces yet: "You haven't been added to a trusted space yet. A family member will add you in."

**Hidden from child view:**
- Everything governance-related: PendingAttention, GovernanceOverview, FamilyHealthPanel, TrustedExtensionsPanel, FounderSettingsPreview, Quick Actions (all create affordances), RelationshipVisibilityCard, FamilySnapshot, SpacesSnapshot

---

## 5. UNKNOWN Age Tier Behavior

UNKNOWN routes to `"member"` via `deriveShellMode` (Agent 22). In the FounderShell this means:
- No governance panels shown
- Guardian inbox shown if the UNKNOWN-tier user happens to have guardian links
- Their spaces and a single invite action available
- Copy is adult-appropriate (not the child-safe variant)

This is the correct conservative default: assume adult participation level, withhold stewardship controls until age is verified by adding a dateOfBirth.

---

## 6. Authorization Note

All three layouts share identical data fetching (familyUnits, trustUnits, approvals, invites, guardianLinks). The layout branching only controls what gets rendered from that data — it does not restrict API access. A member-mode user who calls `/api/aihsafe/activity` with a founder-level action will still be gated by the governance kernel. UI is convenience; backend is authoritative.

---

## 7. Validation Results

```
npm run typecheck  →  0 errors
npm run build      →  ✓ Compiled successfully
```

---

## 8. Remaining Gaps

| Gap | Notes |
|---|---|
| Modal guard for member create actions | Members can only open "invite" modal via the UI. If they somehow call `setModal("family")` or `setModal("space")`, the modal renders `FamilyCreatePanel` / `TrustUnitCreatePanel`. The API routes for those actions enforce governance independently, so this is safe but slightly untidy. Future: validate `modal` against allowed modal kinds per shellMode. |
| Member SpacesSnapshot read-only | Members see `MembershipPanel` (can leave), not `SpacesSnapshot` (which has a create button). This is correct. If members need a richer view of their spaces, a future agent can add a read-only SpacesSnapshot variant. |
| GUARDIAN as explicit shellMode | Guardians who are non-founder/admin members use the member layout. They get GuardianInbox conditionally. A dedicated "guardian" shellMode could surface escalation-specific flows (e.g., pending child activity approvals) more prominently in a future agent. |
| CommentThread viewerMode | Not threaded to CommentThread yet. Minor accounts see the same comment compose UI as founders. Low priority since governance gate enforces restrictions at the API level. |

---

## 9. QA Sign-off

| Agent | Area | Status |
|---|---|---|
| Agent 8–12 | UX scaffold, QA, name, persistence, e2e | ✓ Done |
| Agent 14–18 | Layout, hero, unified mode shell | ✓ Done |
| Agent 19 | Governed activity layer | ✓ Done |
| Agent 20 | Activity layer QA / layout polish | ✓ Done |
| Agent 22 | Role routing + UNKNOWN age safety | ✓ Done |
| Agent 23 | Complete role-based layout branching | ✓ Done |
