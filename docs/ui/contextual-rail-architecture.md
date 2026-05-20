# Shared contextual right rail

**Agent:** 78  
**Branch:** `aihsafe-agent-78-shared-contextual-rail`

The right rail is **persistent relationship context** — not a second dashboard, not duplicate navigation, and not page-specific one-off markup.

## Modes

| Mode | `data-context-rail-mode` | Primary surfaces |
|------|--------------------------|------------------|
| `dashboard` | `dashboard` | `/dashboard` via `DashboardContextRail` |
| `network` | `network` | `/tree` (My Network) via `NetworkPageLayout` |
| `governance` | `governance` | Family Safe tab panels via `FamilySafeContextLayout` |
| `vault` | `vault` | Msg Vault messaging + notices rails via `VaultRailSlot` |

One component tree (`components/context-rail/*`). Each mode renders a **profile** (content bundle), not a separate rail implementation.

## Layout primitives

Reuses existing grid classes from `app/globals.css`:

- `.dashboard-body` + `.thread-hub-grid` — main + rail columns
- `.thread-hub-grid__main` / `__rail` — 232px rail; stacks at ≤860px
- `.context-rail` — vertical stack inside the rail column
- `.context-rail-vault-slot` — vault-specific host (selector + `MsgContextRail`)

## Shared components

| Component | Role |
|-----------|------|
| `ContextRail` | `<aside>` wrapper, mode attribute, `.context-rail` |
| `ContextRailSection` | Compact titled block (+ optional `href`, count) |
| `ContextRailMetaList` | Key/value rows inside a section |
| `ContextRailMemberList` | Reuses `ThreadSelectorRow` / `ThreadSelectorList` |
| `ContextRailQuickActions` | Link or in-tab button actions |
| `ContextRailGovernanceCard` | Msg Rules / Boundaries snapshot (role-filtered) |
| `ContextRailActivityCard` | Lightweight activity hint |
| `ContextRailEmptyState` | Empty rail states |

Profiles: `DashboardRailProfile`, `NetworkRailProfile`, `GovernanceRailProfile`, `VaultRailSlot`.

## Interaction model

Rail rows and actions may:

- **Open thread** — dashboard/vault conversation selection; network “Open thread” → `/msg-vault`
- **Open member detail** — `/profile/[id]` from network member rows
- **Open governance view** — Family Safe tab switches (`onTabChange`) from governance quick actions
- **Open approvals** — governance rail → approvals tab (founder/guardian only)
- **Switch center context** — dashboard selects conversation in center via `DashboardPrivateThreadsContext`

Actions are explicit `ContextRailAction` (`link` | `button`); no hidden side effects.

## Safety and scope

- **Governance:** `GovernanceRailProfile` respects `FamilySafeShellMode` — child shell hides steward-only counts and uses Boundaries copy only; approval counts only for founder/guardian.
- **Business/workspace:** network rail does not infer family authority from workspace entities; trust circles use tree trust-unit data only.
- **Msg Vault:** selector model unchanged; `VaultRailSlot` wraps existing `MsgContextRail` / selector for mode compatibility only.

## Extension

Add a new mode only when a surface needs a distinct **content profile**. Prefer extending an existing profile + props over copying rail markup in page folders.

See also: `docs/msg-vault/context-rail-model.md` (vault-specific rail state machine).
