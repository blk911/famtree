# LT-2 through LT-5 — globals migration report

**Branch:** `ui-lt-styling-foundation` (extend with these commits)  
**Date:** 2026-05-20

## Summary

Completed phases **LT-2 → LT-5** of the long-term styling plan: removed ~500 lines of feature CSS from `globals.css`, migrated consumers to `components/ui/*` primitives with Tailwind + CVA, and expanded the regression guard.

`globals.css` is now **~7.6KB** (shell + tokens + legacy pockets), down from **~18KB+** before this pass.

---

## LT-2 — Dashboard private / hub grid

| Action | Detail |
|--------|--------|
| Removed dead CSS | `.dashboard-private-thread-*` (unused in TSX after Msg Vault convergence) |
| Migrated | `.dashboard-body` / `.thread-hub-grid` → `HubGrid`, `HubGridMain`, `HubGridRail` |
| Consumers | `DashboardHubColumns`, `PrivateThreadsHub`, `NetworkPageLayout`, `FamilySafeContextLayout` |

---

## LT-3 — Msg Vault / thread components

| Primitive file | Covers |
|----------------|--------|
| `components/ui/thread.tsx` | Selector rows, empty state, active panel, composer, avatars, unread badges |
| `components/ui/msg-vault.tsx` | Workspace 3-zone grid, left nav, nav rows, overview summary |

| Consumer | Change |
|----------|--------|
| `vault/ThreadSelectorRow`, `EmptyThreadState`, `ThreadComposer`, `MemberAvatar`, `ThreadStatusDot`, `ThreadSelectorList` | Delegate to `ui/thread` |
| `DashboardPrivateThreadCenter` | `ThreadActivePanel`, `ThreadBadge` |
| `MsgVaultLeftNav`, `MsgVaultNavRow`, `MsgVaultShell` | `ui/msg-vault` |
| `MsgVaultThreadSelectorRail` | Tailwind title (no globals class) |

---

## LT-4 — Family Safe (AIH Safe)

| Primitive file | Covers |
|----------------|--------|
| `components/ui/aihsafe.tsx` | Tabs, overview HQ, spaces CTAs, create-flow steps |

| Consumer | Change |
|----------|--------|
| `FamilySafeTabs` | `AihsafeTabsBar`, `AihsafeTab`, `AihsafeTabBadge` |
| `OverviewOperationalHQ` | Full overview component set |
| `RelationalDashboard` | `AihsafeGrid` |
| `CreateFlowSteps`, `TrustedSpaceCreateFlow`, `FamilyGroupCreateFlow` | Create-flow primitives |
| `SpacesTab` | `AihsafeSpacesCta`, draft note, empty state |

---

## LT-5 — App shell / sidebar

| Primitive file | Covers |
|----------------|--------|
| `components/ui/app-chrome.tsx` | `AppMain`, `AppTopBar`, announcement banner, mobile backdrop, sidebar shell/footer/logout, vault nav badge |

| Consumer | Change |
|----------|--------|
| `AppShell.tsx` | No inline layout styles on main/top bar/banner (Tailwind via primitives) |
| `AppSidebar.tsx` | `SidebarShell`, `SidebarNav`, `SidebarFooter`, `SidebarLogoutButton`, `SidebarVaultBadge` (nav links still use existing `linkStyle` object — next pass can move to `SidebarNavLink`) |

---

## `globals.css` after migration

**Kept:**

- `@tailwind` + `:root` tokens + base reset
- App shell layout (`.app-sidebar`, `.app-main`, `.app-content-pad`, …)
- Invite/admin/feed-hero responsive pockets
- `.aihsafe-hero-img` media query
- `.aih-input:focus` (login)
- `.dashboard-inline-feed img/video` (feed media safety)

**Removed:**

- All `.dashboard-private-*`, `.thread-*`, `.msg-vault-*` feature blocks
- All `.aihsafe-tabs`, `.aihsafe-overview`, `.aihsafe-spaces`, `.aihsafe-create-flow` blocks
- Hub grid / dashboard-body duplicate definitions

---

## Regression guard

`npm run check:globals-css` — extended forbidden list for LT-2–5 selectors.

---

## Validation

| Command | Result |
|---------|--------|
| `npm run check:globals-css` | **Pass** |
| `npm run typecheck` | **Pass** |
| `npx next build` | **Pass** |

---

## Manual QA checklist

- [ ] `/dashboard` — CTA strip + hub + private threads + context rail
- [ ] `/msg-vault` — 3-zone workspace, tabs, overview summary, chats/threads
- [ ] `/aihsafe` — tab bar, overview HQ, spaces tab, create flows
- [ ] App shell — top bar, vault announcement banner (on family-vault routes), sidebar open/close
- [ ] `/tree` — network layout + rail

---

## Remaining globals debt (future)

- `AppSidebar` nav `linkStyle` / `subLinkStyle` inline objects → `SidebarNavLink` / `SidebarSubNavLink` (LT-5b)
- Invite/admin/feed responsive classes in `globals.css` (true layout shell — OK to keep)
- `ContextRailSection` inline card styles → optional `ui/context-rail` module

---

*LT-2–5 complete on top of LT foundation (CtaCard + dashboard CTA migration).*
