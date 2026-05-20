# Agent 78 — Shared contextual rail report

**Branch:** `aihsafe-agent-78-shared-contextual-rail`  
**Date:** 2026-05-19

## Summary

Introduced `components/context-rail/*` as the single right-rail system for Dashboard, My Network, Family Safe, and Msg Vault (foundation). Page-specific rail markup was refactored into mode profiles; layouts compose `ContextRail` + profile without duplicating grid or section logic.

## Rail modes

| Mode | Profile | Wired via |
|------|---------|-----------|
| `dashboard` | `DashboardRailProfile` | `DashboardContextRail` → `DashboardHubColumns` |
| `network` | `NetworkRailProfile` | `NetworkPageLayout` → `TreePageClient` on `/tree` |
| `governance` | `GovernanceRailProfile` | `FamilySafeContextLayout` → `FounderShell` (all tab panels) |
| `vault` | `VaultRailSlot` (host) | `MsgVaultShell` messaging + notices rails |

## Shared components created

- `ContextRail.tsx`, `ContextRailSection.tsx`, `ContextRailMemberList.tsx`
- `ContextRailQuickActions.tsx`, `ContextRailGovernanceCard.tsx`, `ContextRailActivityCard.tsx`, `ContextRailEmptyState.tsx`
- `types.ts`, `index.ts`
- Profiles under `profiles/`
- Layout helpers: `NetworkPageLayout.tsx`, `FamilySafeContextLayout.tsx`

Legacy re-exports: `components/dashboard/ContextRailCard.tsx`, `components/vault/ContextRailSection.tsx` → `context-rail`.

## Pages migrated

| Page | Change |
|------|--------|
| `/dashboard` | Existing rail behavior preserved; implementation moved to `DashboardRailProfile` |
| `/tree` (My Network) | `TreePageClient` + `NetworkPageLayout`; pending invites from `listSentInvitesForSender` |
| `/aihsafe` (Family Safe) | Tab content wrapped in `FamilySafeContextLayout` with governance rail |
| `/msg-vault` | `ContextRail mode="vault"` + `VaultRailSlot` around selector and `MsgContextRail` (both messaging and notices panes) |

## Interaction model

- Dashboard: tree preview, trust units, Msg Vault threads/CTA, bond peers — same as pre-78, centralized in profile.
- Network: family list, trust circles, pending invites, quick links to Msg Vault / invite / tree navigation.
- Governance: governance card, members (from trust units), activity hint, quick actions (tab switches + external links); child-safe Boundaries section.
- Vault: no selector redesign; slot wrapper only for consistent `data-context-rail-mode="vault"`.

## Remaining gaps

1. **Workspace/org groups on network rail** — not shown unless server sends distinct workspace units; dashboard trust-unit shape has no `kind` filter yet.
2. **Member badges on governance rail** — founder/child badges not on every row (display names from TU members only).
3. **Vault rail state machine** — full dynamic profiles per `docs/msg-vault/context-rail-model.md` remain in `MsgContextRail`; not merged into shared profiles.
4. **Member / child Family Safe shells** — confirm non-founder shells also use `FamilySafeContextLayout` if split from `FounderShell` in future.
5. **Stale `.next` cache** — local build may fail until `.next` cleared if orphaned page references exist (unrelated admin route).

## Validation

| Check | Result |
|-------|--------|
| `npm run typecheck` | Pass |
| `npx next build` | Pass (after clean `.next`) |

## Files touched (Agent 78)

**New:** `components/context-rail/**`, `components/network/TreePageClient.tsx`, `docs/ui/*`

**Modified:** `app/(app)/tree/page.tsx`, `app/globals.css`, `components/dashboard/DashboardContextRail.tsx`, `components/dashboard/ContextRailCard.tsx`, `components/vault/ContextRailSection.tsx`, `components/aihsafe/founder/FounderShell.tsx`, `components/msg-vault/MsgVaultShell.tsx`
