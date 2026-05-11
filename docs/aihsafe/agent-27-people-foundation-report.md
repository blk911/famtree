# Agent 27 — People Tab Foundation

**Branch:** `aihsafe-agent-27-people-foundation`
**Date:** 2026-05-11
**Scope:** Build a real, relationship-aware People tab replacing the scattered trusted-extensions/snapshot layout. No new APIs, no schema changes.

---

## 1. Files Created

| File | Purpose |
|---|---|
| `components/aihsafe/people/RelationshipBadge.tsx` | Pill badge for guardian link kind and permission level |
| `components/aihsafe/people/PersonRow.tsx` | One person row: initials avatar, name, badge, detail sub-line |
| `components/aihsafe/people/PeopleSection.tsx` | Labeled group card with count chip and empty state |
| `components/aihsafe/people/PeopleTab.tsx` | Main tab component — categorizes all relationships, renders sections |

## 2. Files Modified

| File | Change |
|---|---|
| `components/aihsafe/founder/FounderShell.tsx` | Replaced People tab panel (RelationshipVisibilityCard + TrustedExtensionsPanel) with `<PeopleTab>`; added import; removed unused imports |

---

## 2. Component Design

### RelationshipBadge
Renders up to two pill chips: one for `kind` (parent, grandparent, legal_guardian, trusted_adult) and one for `permissionLevel` (view_only, approver, full_control). Each uses a distinct colour token. Fully server-renderable (no state).

### PersonRow
Deterministic initials avatar (first + last initial, colour seeded by `name.charCodeAt(0)`). Accepts a `badge` ReactNode slot, a `detail` sub-line, and an optional `dimmed` flag for expired/revoked entries.

### PeopleSection
Card wrapper with icon, title, optional count chip, child rows with dividers, and an `emptyText` fallback when there are no children.

### PeopleTab
Consumes `trustUnits`, `familyUnits`, `guardianLinks`, `invites`, and `loading` — no new API calls.

**Categorization logic:**

| Section | Source | Filter |
|---|---|---|
| My guardians | `guardianLinks` | `childUserId === currentUserId && !revokedAt` |
| Children & teens | `guardianLinks` | `guardianUserId === currentUserId && kind !== "trusted_adult" && !revokedAt` |
| Trusted adults | `guardianLinks` | `guardianUserId === currentUserId && kind === "trusted_adult" && !revokedAt` |
| Family members | `familyUnits[].members` | Not self, not in guardian links, not exited |
| Network members | `trustUnits[].members` | Not self, not already categorized, not exited |
| Pending invites | `invites` | `status === "PENDING"` |

Deduplication across multiple family/trust units: Map keyed by `userId`, accumulates unit names.

**Steward banner** shown only for `shellMode === "founder"` — purple accent, explains governance role.

**Empty state**: full-page empty state with invite CTA when `totalPeople === 0 && pendingInvites.length === 0`. Compact "Invite someone new" button at bottom when people are already present.

---

## 3. People Tab QA Matrix

| Section | Founder | Guardian member | Adult member |
|---|---|---|---|
| Steward banner | ✅ Shows purple "You are the network steward" card | — | — |
| My guardians | ✅ If current user has a guardian link where they are child | ✅ Same | ✅ Same |
| Children & teens | ✅ Shows supervised children with kind + permission badges | ✅ Same | — (no guardian links) |
| Trusted adults | ✅ Shows trusted_adult links | ✅ Same | — |
| Family members | ✅ Family unit members not in guardian links | ✅ Same | ✅ Same |
| Network members | ✅ Trust unit members not already categorized | ✅ Same | ✅ Same |
| Pending invites | ✅ Outgoing PENDING invites | ✅ Same | ✅ Same |
| Empty state | ✅ If zero people + zero invites | ✅ Same | ✅ Same |
| Invite CTA | ✅ Bottom button when people present | ✅ Same | ✅ Same |

---

## 4. Validation Results

```
npx tsc --noEmit  →  0 errors
npm run build     →  ✓ Compiled successfully
```

---

## 5. Remaining Gaps (out of scope)

| Gap | Notes |
|---|---|
| Guardian link revocation UI | `revokedAt` links filtered out silently; no revoke button yet. Phase 4. |
| Child → guardian contact | No "message my guardian" CTA. Social messaging is out of scope. |
| Network member count per space | Shows space names but not individual member counts. Low priority. |
| Expired invite cleanup | Expired invites shown dimmed; no delete/resend action. P2. |

---

## 6. QA Sign-off

| Agent | Area | Status |
|---|---|---|
| Agent 22 | Role routing + UNKNOWN age safety | ✓ Done |
| Agent 23 | Complete role-based layout branching | ✓ Done |
| Agent 24 | Role view visual QA | ✓ Done |
| Agent 25 | Internal navigation shell | ✓ Done |
| Agent 26 | Nav QA / live flow polish | ✓ Done |
| Agent 27 | People tab foundation | ✓ Done |
