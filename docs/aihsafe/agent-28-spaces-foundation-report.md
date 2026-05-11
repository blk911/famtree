# Agent 28 — Spaces Tab Foundation

**Branch:** `aihsafe-agent-28-spaces-foundation`
**Date:** 2026-05-11
**Scope:** Replace the Spaces tab scattered layout (SpacesSnapshot + FamilySnapshot + MembershipPanel) with a unified, role-aware SpacesTab. No new APIs, no schema changes.

---

## 1. Files Created

| File | Purpose |
|---|---|
| `components/aihsafe/spaces/SpaceKindBadge.tsx` | Pill badge for space kind (family, peer, extended, guardian) with icon + color tokens |
| `components/aihsafe/spaces/SpaceCard.tsx` | One space card: icon, name/fallback, kind badge, member count, visibility scope, status tags, leave/invite actions |
| `components/aihsafe/spaces/SpacesSection.tsx` | Labeled section wrapper with count chip, header action slot, empty state + empty action |
| `components/aihsafe/spaces/SpacesTab.tsx` | Main tab component — organizes all spaces into Family Groups, Trusted Spaces, and Pending Invites sections |

## 2. Files Modified

| File | Change |
|---|---|
| `components/aihsafe/founder/FounderShell.tsx` | Replaced Spaces tab panel with `<SpacesTab>`; removed unused imports (`SpacesSnapshot`, `FamilySnapshot`, `MembershipPanel`); removed local `ChildApprovedSpacesCard` function; added `SpacesTab` import |

---

## 3. Data Sources Used

| Data | Source | Notes |
|---|---|---|
| `trustUnits` | FounderShell prop (fetched via `listTrustUnits`) | Active trust unit memberships for current user |
| `familyUnits` | FounderShell prop (fetched via `listFamilyUnits`) | Family units for current user |
| `invites` | FounderShell prop (fetched via `listInvites`) | Outgoing invites — filtered to `status === "PENDING"` |
| `exitMembership` | `apiClient` | Called directly in SpacesTab for the Leave action; calls `DELETE /api/aihsafe/memberships/[id]` |

No new API calls added. All data comes from the existing FounderShell parallel load.

---

## 4. Space Sections Implemented

| Section | Shown when | Data source |
|---|---|---|
| Family Groups | Always (founder + member) | `familyUnits` |
| Trusted Spaces | Always (founder + member) | `trustUnits` |
| Pending Invites | Founder always; member when invites exist | `invites.filter(PENDING)` |
| Your Approved Circles | Child mode only | `familyUnits` + `trustUnits` combined |
| All-empty state | No spaces + no pending invites | computed |

---

## 5. Role-Specific Behavior

### Founder
- **Family Groups**: Shows all family units; "Founded by you" badge on units where `createdByUserId === currentUserId`; "+ New" header button + "+ Create a family group" empty CTA; Invite button per card
- **Trusted Spaces**: Shows all trust units with kind badge, visibility scope, member count; "+ New" + "+ Create a trusted space" empty CTA; Invite button per card
- **Pending Invites**: Full section always visible; "+ Invite" header button; expired invites shown dimmed

### Adult member
- **Family Groups**: Shows family units as read-only member (no admin controls; family membership managed by founder)
- **Trusted Spaces**: Shows trust units with Leave button per card (calls `exitMembership`); errors displayed inline
- **Pending Invites**: Section shown only when pending invites exist

### Child/Teen
- Single section "Your approved circles" — friendly language, no admin controls, no leave button, no create CTAs
- Empty state: "You haven't been added to any circles yet. A family member will invite you in."

---

## 6. Known Data Limitations

| Limitation | Cause | Impact |
|---|---|---|
| No creator badge on trust units | `TrustUnitMember.role` is always `"member"` (Phase 4 schema gap — no role column) | Cannot show "Founded by you" for trust units; only `FamilyUnitDTO.createdByUserId` enables this for family groups |
| No "Spaces I Oversee" section | Same Phase 4 gap — creator/moderator distinction not available in current schema | Documented; oversight is implied by presence of family + trust units in their set |
| `Invite.trustUnitId` / `Invite.familyUnitId` always null | Phase 4 schema gap per pre-beta-checklist.md | Pending invites can't show which space they relate to; only email + relationship shown |
| Family membership cannot be left | No `DELETE /api/aihsafe/memberships` path for FamilyUnit membership | By design — family membership is steward-managed; no Leave button on family group cards |

---

## 7. Validation Results

```
npx tsc --noEmit  →  0 errors
npm run build     →  ✓ Compiled successfully
```

---

## 8. Next Recommended Step

**Agent 29 — Spaces detail / space management**
- When a user clicks on a SpaceCard, show a detail panel or modal with:
  - Full member list with avatars
  - For founder: remove member, change space name, dissolve space
  - For member: leave confirmation dialog (replaces inline leave button)
- Requires `GET /api/aihsafe/trust-units/[trustUnitId]` (already in topology, not yet called from UI)
- Or consider merging with a full settings/admin screen for each space

---

## QA Sign-off

| Agent | Area | Status |
|---|---|---|
| Agent 22 | Role routing + UNKNOWN age safety | ✓ Done |
| Agent 23 | Complete role-based layout branching | ✓ Done |
| Agent 24 | Role view visual QA | ✓ Done |
| Agent 25 | Internal navigation shell | ✓ Done |
| Agent 26 | Nav QA / live flow polish | ✓ Done |
| Agent 27 | People tab foundation | ✓ Done |
| Agent 28 | Spaces tab foundation | ✓ Done |
