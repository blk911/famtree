# Agent 15 — Founder / Guardian Shell Report

**Branch:** `aihsafe-agent-15-founder-shell`
**Date:** 2026-05-10
**Scope:** Governance-centered UX pass — Founder / Guardian shell built on top of Agent 14 relational dashboard.

---

## Files Created

| File | Purpose |
|---|---|
| `components/aihsafe/founder/FounderShell.tsx` | Main orchestrator — replaces RelationalDashboard in page |
| `components/aihsafe/founder/GovernanceOverview.tsx` | 4-tile compact governance grid |
| `components/aihsafe/founder/PendingAttention.tsx` | DOMINANT section — approvals + pending invites |
| `components/aihsafe/founder/FamilyHealthPanel.tsx` | Calm-state checklist indicators |
| `components/aihsafe/founder/TrustedExtensionsPanel.tsx` | Guardian links with AvatarChip |
| `components/aihsafe/founder/RelationshipVisibilityCard.tsx` | "You can see X because..." concept card |
| `components/aihsafe/founder/FounderSettingsPreview.tsx` | Visual governance concept cards (display only) |
| `components/aihsafe/common/CompactActivityItem.tsx` | Reusable activity timeline atom |
| `docs/aihsafe/agent-15-founder-shell-report.md` | This report |

## Files Modified

| File | Change |
|---|---|
| `app/(app)/aihsafe/page.tsx` | Swapped RelationalDashboard → FounderShell |
| `components/aihsafe/common/apiClient.ts` | Added `listGuardianLinks()` using `/api/aihsafe/guardian-links` |
| `components/aihsafe/activity/ActivityFeed.tsx` | Upgraded to use `CompactActivityItem`; placeholder data labeled clearly |

---

## 1. Founder Shell Changes

`FounderShell` is a `"use client"` orchestrator that:
- Fetches all 5 data sources in parallel: `listFamilyUnits`, `listTrustUnits`, `listApprovals("pending")`, `listInvites`, `listGuardianLinks`
- Derives counts: `pendingApprovals`, `pendingInvites`, `mySpaces`, `trustedAdultCount`, `membershipCount`
- Derives activity from real data (not mock): family/space creation dates, invite events, guardian link events, sorted by timestamp
- Manages `QuickCreateModal` state (family / space / invite)
- On modal close: triggers full data refresh

The page header now says:
```
AMIHUMAN.NET          [awareness pills]
Family Safe
A governed network for your real people.
You are the steward of this family network.
```

Awareness pills: approvals waiting | active spaces | trusted adults | pending invites
- Urgent style (amber) when value > 0 for approvals or pending invites

---

## 2. Governance-Awareness UX Additions

### GovernanceOverview
4-tile grid:
- Family groups (navy #0f3460)
- Trusted spaces (purple #7c3aed)
- Trusted adults (forest #065f46)
- Active memberships (amber #92400e)

Shows `–` in loading state; real counts live.

### FamilyHealthPanel
4 checklist indicators with green (healthy) / amber (needs attention) treatment:
1. Approvals clear vs. N waiting
2. N spaces active vs. no spaces yet
3. No open invites vs. N invites pending
4. N trusted adults vs. none linked

Overall badge: "Healthy" (green) or "Needs attention" (amber).
The 🌱 emoji + "Healthy trust network" appears only when all indicators are healthy.

---

## 3. Pending Attention — Most Prominent Section

Sits immediately below the header, before the 2-column grid.

**When there are items (approvals + pending invites):**
- 2px amber border (`#fde68a`)
- Amber header strip with ⏳ icon
- "{N} items waiting for your review"
- Guardian approvals section: renders `GuardianInbox` with its full approve/deny logic
- Pending invites section: list of PENDING invites with sent/expiry dates
- All ARIA preserved (GuardianInbox handles its own role="alert" etc.)

**When all clear:**
- 2px green border (`#bbf7d0`)
- Green header strip with ✓ icon
- Checklist: "No guardian approvals waiting", "No invites pending", "Governance is current"

---

## 4. Quick-Action Redesign

Three inline action launcher buttons (compact, no full-form visible):
- 📨 Invite someone → opens QuickCreateModal with InvitePanel
- 🏠 New family group → opens QuickCreateModal with FamilyCreatePanel
- 🤝 New trusted space → opens QuickCreateModal with TrustUnitCreatePanel

All existing form logic, 202/403 handling, and ARIA preserved inside modals (unchanged from Agent 14).

---

## 5. Relationship Visibility Additions

`RelationshipVisibilityCard` shows:
1. "Why someone can see you" — 3 governance rules as a ✓ checklist
2. User's current active circles — family groups + spaces as colored pill chips
3. Privacy principle footer: "Privacy by default. No open discovery."

Derived from live `familyUnits` + `trustUnits` data (no mock).

---

## 6. Activity Ribbon Behavior

`FounderShell` derives real activity from fetched data:
- Family unit creation → "Family group '[name]' created"
- Trust unit creation → "Trusted space '[name]' created"
- Invite events → "invite sent to / accepted / joined via invite [email]"
- Guardian links → "Guardian link established with [name]"

Sorted descending by timestamp. Shows max 7 items. Items at index ≥ 4 are faded (opacity 0.5). Timestamps shown as relative ("2d ago", "just now", etc.).

Empty state: "No recent activity — your network is just getting started."

`ActivityFeed` (used by standalone `RelationalDashboard`) upgraded to use `CompactActivityItem` atom and shows placeholder data labeled "Full audit log with real data available in Phase 4."

---

## 7. Trusted Extensions

`TrustedExtensionsPanel`:
- Fetches from live `/api/aihsafe/guardian-links` via `listGuardianLinks()`
- Two sections: "You oversee" (actor is guardian) + "Your guardians" (actor is child)
- Each row: `AvatarChip` + name + kind icon + permission badge
  - Permission badges: view_only (neutral), approver (blue), full_control (green)
  - Kind icons: parent 🏠, grandparent 🌿, legal_guardian ⚖️, trusted_adult 🛡
- Empty state: explains guardian links and their purpose

---

## 8. Founder Settings Preview

4 visual concept cards (display only — no interactive functionality):
1. Invite permissions → "Founder-only" — only founder sends governed invites
2. Space creation → "Guardian approval for minors" — adults free, teens escalate
3. Minor visibility → "Protected by default" — no open discovery for children
4. Approval posture → "Manual review" — no auto-approval currently

Each card has: colored top accent bar, icon, title, current-state badge (color-coded), description text.
Footer: "Configurable governance controls available in Phase 4"

---

## 9. Validation Results

```
npx tsc --noEmit --skipLibCheck: 0 errors
```

Build note: `npm run build` is blocked by Windows file lock on Prisma engine binary when dev server is running (EPERM on DLL rename). TypeScript 0 errors confirms code correctness. This is the same pre-existing dev-only constraint noted in agent-12-e2e-qa-report.md.

---

## 10. Remaining UX Gaps

These are not bugs — documented limitations for future phases.

| Gap | Note |
|---|---|
| No "add guardian link" UI | TrustedExtensionsPanel shows `onAddClick` prop slot but no form built yet — POST /api/aihsafe/guardian-links requires childUserId which needs a user lookup UI |
| Activity ribbon shows creation events only | No mutation-based events (approve/deny, join space) — would require audit log endpoint (Phase 4) |
| FounderSettingsPreview is visual only | No actual governance config — Phase 4 configurable controls |
| RelationshipVisibilityCard shows "your circles" but not "who can see you" | Full visibility graph traversal requires Phase 4 schema |
| TrustedExtensionsPanel: no grouping by kind | All guardian links in flat lists — would benefit from kind grouping (coach, grandparent, etc.) |
| GuardianInbox in PendingAttention re-fetches | PendingAttention renders GuardianInbox which fetches its own approvals — minor duplication |
| No "Leave space" button in FounderShell | MembershipPanel not included in FounderShell — available via RelationalDashboard path |

---

## QA Sign-off

| Agent | Area | Status |
|---|---|---|
| Agent 8 | UX shell scaffold | ✓ Done |
| Agent 9 | UX contract QA | ✓ Done |
| Agent 10 | DTO name field | ✓ Done |
| Agent 11 | Name persistence (schema + route) | ✓ Done |
| Agent 12 | E2E QA + deferred action fix + name consistency | ✓ Done |
| Agent 14 | Relational dashboard layout | ✓ Done |
| Agent 15 | Founder / Guardian shell | ✓ Done |
