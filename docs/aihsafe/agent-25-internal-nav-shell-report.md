# Agent 25 — Family Safe Internal Navigation Shell

**Branch:** `aihsafe-agent-25-internal-nav-shell`
**Date:** 2026-05-11
**Scope:** Internal navigation shell for Family Safe. Replaces the single long-scroll dashboard with a compact horizontal tab bar and focused tab sections. No new APIs, no schema changes, no auth changes.

---

## 1. Files Created / Modified

| File | Change |
|---|---|
| `components/aihsafe/navigation/FamilySafeTabs.tsx` | NEW — tab bar component, `getVisibleTabs()`, `defaultTab()`, keyboard nav |
| `components/aihsafe/founder/FounderShell.tsx` | Restructured — tab state, TabPanel wrapper, all panels moved into focused sections |
| `app/globals.css` | Added `.aihsafe-tabs-bar`, `.aihsafe-tab`, `.aihsafe-tab--active` CSS |

---

## 2. Internal Navigation / Tab Structure

```
FamilySafeShellMode = "founder":
  Overview | Activity | Spaces | People | Approvals | Settings

FamilySafeShellMode = "member" + isGuardian=true:
  Overview | Activity | Spaces | People | Approvals

FamilySafeShellMode = "member" + isGuardian=false:
  Overview | Activity | Spaces | People

FamilySafeShellMode = "child":
  Activity | Spaces
```

Tabs are rendered in a pill-style horizontal bar (`role="tablist"`) below the hero card. On mobile the bar scrolls horizontally with `overflow-x: auto` and hidden scrollbar.

---

## 3. Role-Aware Tab Visibility

| Tab | Founder/Admin | Guardian member | Adult member | Child/Teen |
|---|---|---|---|---|
| Overview | ✅ | ✅ | ✅ | ❌ |
| Activity | ✅ | ✅ | ✅ | ✅ |
| Spaces | ✅ | ✅ | ✅ | ✅ |
| People | ✅ | ✅ | ✅ | ❌ |
| Approvals | ✅ | ✅ | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ | ❌ |

`getVisibleTabs(shellMode, isGuardian)` is a pure function in `FamilySafeTabs.tsx`. Guardian status is derived from `guardianLinks.some(l => !l.revokedAt)` — already computed in FounderShell.

Default tab: `"overview"` for founder/member; `"activity"` for child.

---

## 4. Overview Tab Behavior

**Founder:** 2-column grid. Left column: PendingAttention (only if items present), GovernanceOverview, FamilyHealthPanel. Right column: Quick Actions card (all 3: invite, new family group, new trusted space).

**Member:** Single column (max-width 680px). GuardianInbox (if isGuardian), "Your spaces" (MembershipPanel), Quick Actions (invite only).

**Child:** Not shown (tab hidden).

The PendingAttention component on the Overview tab only renders when `pendingApprovals.length > 0` — the "all clear" state is surfaced via the Approvals tab instead of cluttering Overview.

---

## 5. Activity Tab Behavior

**All modes:** Single centered column (max-width 720px, margin auto). Contains only `ActivityFeed` with `viewerMode` passed through.

- No right rail
- No governance panels
- Calmer, feed-centric view
- PostComposer, ActivityCard, CommentThread all behave per their existing `viewerMode` logic

This is the cleanest change: Activity is now purely the feed. The right-rail governance noise that appeared beside the feed previously is gone.

---

## 6. Spaces / People / Approvals / Settings Tab Behavior

### Spaces
- **Founder:** 2-column grid — SpacesSnapshot (left, with create button) + FamilySnapshot (right, with create button).
- **Member:** Single column, MembershipPanel with "Leave space" button per space.
- **Child:** Single column (max-width 560px), ChildApprovedSpacesCard — read-only, no leave button.

### People
- **Founder:** 2-column grid — RelationshipVisibilityCard (left) + TrustedExtensionsPanel (right).
- **Member:** Single column, RelationshipVisibilityCard only (no guardian management affordances).
- **Child:** Tab not visible.

### Approvals
- **Founder:** PendingAttention (full list including all-clear state) + GuardianInbox card.
- **Guardian member:** GuardianInbox card only (PendingAttention suppressed for non-founder).
- **Adult member / child:** Tab not visible.

### Settings
- **Founder only:** FounderSettingsPreview — governance settings with "Preview · Phase 4" badge.

---

## 7. Pending Badge on Approvals Tab

When `pendingApprovals.length + pendingInvites.length > 0`, a scoped `<style>` tag injects a CSS `::after` pseudo-element on `#aihsafe-tab-approvals` showing the count in an amber badge. This avoids adding extra DOM to the tab bar component while surfacing urgency clearly.

---

## 8. Keyboard Navigation

`FamilySafeTabs` implements the WAI-ARIA tab pattern:

| Key | Behavior |
|---|---|
| `ArrowRight` | Focus + activate next tab (wraps) |
| `ArrowLeft` | Focus + activate previous tab (wraps) |
| `Home` | Focus + activate first tab |
| `End` | Focus + activate last tab |
| `Tab` | Move focus into the active tab panel |

Each tab has `tabIndex={isActive ? 0 : -1}` — only the active tab is in the natural tab order.

---

## 9. Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| `> 900px` | 2-column grid for Overview, Spaces, People tabs |
| `≤ 900px` | 1-column stack (via `.aihsafe-grid` responsive class) |
| `≤ 680px` | Hero image panel hidden (existing `.aihsafe-hero-img` rule) |
| All sizes | Tab bar scrolls horizontally if tabs overflow; scrollbar hidden |

The Activity tab is always single-column (no grid class) so it stacks naturally on all screen sizes.

---

## 10. Validation Results

```
npm run typecheck  →  0 errors
npm run build      →  ✓ Compiled successfully
                       /aihsafe  16.1 kB  (dynamic, server-rendered)
```

---

## 11. UX Before / After

| Before | After |
|---|---|
| One long scrolling page with all panels stacked | Focused sections per tab — no endless scroll |
| Governance panels shown beside the feed | Activity tab = feed only, governance moved to Overview/Approvals |
| All content visible to all roles (gated by display) | Tabs themselves are hidden per role — reduces cognitive load |
| "Quick Actions" and "PendingAttention" always visible | "Quick Actions" in Overview right rail; "Approvals" tab for pending items |
| No navigation affordance — feels like a dashboard | Feels like an internal operating environment |

---

## 12. Remaining Gaps (not fixed — out of scope)

| Gap | Notes |
|---|---|
| `modal` kind not validated against shellMode | A member could trigger `setModal("family")` or `setModal("space")` via keyboard/direct call. API routes enforce governance independently. Future: validate modal kinds per shellMode. |
| CommentThread viewerMode | Not threaded to CommentThread. Low priority — governance gate enforces at API level. |
| GUARDIAN as explicit shellMode | Guardians use member layout with conditional Guardian Inbox. A dedicated shellMode could surface escalation flows more prominently. |
| Tab URL persistence | Active tab resets on page reload. Future: use URL hash or search param to persist tab state across refreshes. |
| Approvals badge render on SSR | The `<style>` injection approach works for CSR but is not server-rendered. Amber count only appears after hydration. Acceptable for Phase 3. |

---

## 13. QA Sign-off

| Agent | Area | Status |
|---|---|---|
| Agent 19 | Governed activity layer | ✓ Done |
| Agent 20 | Activity layer QA / layout polish | ✓ Done |
| Agent 22 | Role routing + UNKNOWN age safety | ✓ Done |
| Agent 23 | Complete role-based layout branching | ✓ Done |
| Agent 24 | Role view visual QA | ✓ Done |
| Agent 25 | Internal navigation shell | ✓ Done |
