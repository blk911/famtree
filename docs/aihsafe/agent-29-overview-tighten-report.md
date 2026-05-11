# Agent 29 — Overview Tab Tighten

**Branch:** `aihsafe-agent-29-overview-tighten`
**Date:** 2026-05-11
**Scope:** Restructure the Family Safe Overview tab so it answers "What needs my attention, and is my family network healthy?" without duplicating full flows from Approvals, Spaces, People, or Activity tabs.

---

## 1. Files Created

| File | Purpose |
|---|---|
| `components/aihsafe/founder/OverviewCommandCard.tsx` | Compact attention signal (pending count + "Review →" route to Approvals tab). No full inbox. |
| `components/aihsafe/founder/NextBestActions.tsx` | Contextual action cards that route to sibling tabs or open modals — max 4 shown, prioritized by urgency |
| `components/aihsafe/founder/RecentActivityTeaser.tsx` | Self-fetching 3-post compact teaser using existing `listActivityFeed`. Hidden if empty or errored. |

## 2. Files Modified

| File | Change |
|---|---|
| `components/aihsafe/founder/FounderShell.tsx` | Rewrote Overview tab panel for all three shell modes; removed `GovernanceOverview` import; added three new imports |

---

## 3. Overview Structure After Change

### Founder

```
┌─ OverviewCommandCard ───────────────────────────────────────┐
│  ⏳ "N items need your attention" [Review →]                 │
│  OR: ✓ "Everything looks clear today."                      │
└─────────────────────────────────────────────────────────────┘
┌─ FamilyHealthPanel (kept) ──────────┐  ┌─ NextBestActions ─┐
│  4 health indicators (✓/!)          │  │  Review approvals  │
│  Green/amber rows, compact          │  │  Invite someone    │
│  All-healthy state shown            │  │  New trusted space │
└─────────────────────────────────────┘  │  Post an update   │
┌─ RecentActivityTeaser ──────────────┐  └───────────────────┘
│  Up to 3 compact post items         │
│  [See all →] routes to Activity tab │
│  Hidden if feed is empty            │
└─────────────────────────────────────┘
```

### Guardian / Adult Member

```
┌─ OverviewCommandCard (if isGuardian) ───────────────────────┐
│  Compact attention: N approvals waiting [Review →]           │
└─────────────────────────────────────────────────────────────┘
┌─ Network summary card ──────────────────────────────────────┐
│  N spaces · N trusted adults                                 │
│  [Manage spaces →]  [See people →]  (tab links)             │
└─────────────────────────────────────────────────────────────┘
┌─ NextBestActions ───────────────────────────────────────────┐
│  Review approvals (if pending) · Post update · Invite       │
└─────────────────────────────────────────────────────────────┘
```

### Child / Teen

```
┌─ Belonging card ────────────────────────────────────────────┐
│  ❤️  "You're in your family's safe space."                  │
│  Warm copy about private circles.                           │
│  [💬 See what's happening] → Activity tab                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Duplications Removed

| What was removed | From | Why |
|---|---|---|
| Full `PendingAttention` (with embedded `GuardianInbox`) | Founder Overview | Approvals tab already has it; Overview now shows compact count + route link only |
| Full `GuardianInbox` (approve/deny buttons) | Member Overview | Same — Approvals tab is the resolution surface |
| `GovernanceOverview` (4-tile grid) | Founder Overview | Hero stat cards above the tab bar already show family count, spaces, trusted adults, invites |
| Quick Actions card (raw modal-only buttons) | Founder + Member Overview | Replaced by `NextBestActions` which routes to tabs when possible and falls back to modals |

---

## 5. Role-Specific Overview Behavior

| Aspect | Founder | Guardian member | Adult member | Child |
|---|---|---|---|---|
| Attention signal | OverviewCommandCard (approvals + invites) | OverviewCommandCard (approvals only) | Hidden | Hidden |
| Health indicators | FamilyHealthPanel (4 rows) | — | — | — |
| Network summary | — (in hero) | compact stats + tab links | compact stats + tab links | — |
| Next steps | Up to 4, urgency-ordered | Review approvals + Post + Invite | Post + Invite | — |
| Activity teaser | Yes (3 posts, self-fetching) | — | — | — |
| Belonging card | — | — | — | Yes (warm CTA → Activity tab) |

### NextBestActions priority order (Founder)
1. "Review N approvals" (only if pending → Approvals tab)
2. "Create a trusted space" / "Create a family group" (only if zero spaces)
3. "Invite someone" (always → modal)
4. "Post a family update" (only if spaces exist → Activity tab)
5. "Add a trusted adult" (only if none → People tab)
Max 4 shown. Items 2–5 compete based on network state.

---

## 6. Validation Results

```
npx tsc --noEmit  →  0 errors
npm run build     →  ✓ Compiled successfully
```

---

## 7. Remaining UX Gaps

| Gap | Notes |
|---|---|
| `RecentActivityTeaser` makes a separate fetch on mount | Could be eliminated if FounderShell's parallel load included activity items. Low priority — teaser hides gracefully if it fails. |
| `FamilyHealthPanel` still shows 4 rows even if all are healthy | Consider collapsing to a single "Healthy ✓" line when allHealthy. Agent 30 polish. |
| Member Overview has no activity teaser | Feed fetch in member mode requires the same self-fetch pattern. Easy addition if needed. |
| Child Overview has no Spaces access from Overview | Child goes to Activity from Overview; Spaces tab is their spaces view. Acceptable — Overview is minimal for child. |
| `GovernanceOverview` component still exists | Unused by any tab now. Could be deleted in a cleanup pass or repurposed as a compact admin view. |

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
| Agent 29 | Overview tab tighten | ✓ Done |
