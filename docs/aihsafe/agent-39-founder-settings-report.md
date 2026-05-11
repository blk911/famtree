# Agent 39 — Founder Settings Persistence + API Report

**Date:** 2026-05-11  
**Branch:** aihsafe-agent-39-founder-settings

---

## 1. Files Created

| File | Purpose |
|---|---|
| `app/api/aihsafe/founder-settings/route.ts` | GET + PATCH API route for AihFounderSettings |
| `components/aihsafe/founder/FounderSettingsEditor.tsx` | Live interactive settings editor (replaces static preview) |
| `docs/aihsafe/agent-39-founder-settings-report.md` | This document |
| `docs/aihsafe/founder-settings-flow.md` | Persistence and enforcement flow narrative |

## 2. Files Modified

| File | Change |
|---|---|
| `types/aihsafe/dto.ts` | Added `FounderSettingsDTO`, `PatchFounderSettingsRequest` |
| `types/aihsafe/audit-events.ts` | Added `FOUNDER_SETTINGS_UPDATED` audit event kind |
| `lib/aihsafe/api/envelopes.ts` | Added `forbidden()` response helper |
| `components/aihsafe/common/apiClient.ts` | Added `getFounderSettings()`, `patchFounderSettings()` |
| `components/aihsafe/founder/FounderShell.tsx` | Replaced `FounderSettingsPreview` import+usage with `FounderSettingsEditor` |

## 3. API Routes Added

### GET `/api/aihsafe/founder-settings`

- Auth: `requireAuth()` → role must be `"founder"` or `"admin"` (403 otherwise)
- Reads `AihFounderSettings` row using singleton ID `"singleton"`
- **Auto-creates** the row with schema defaults on first call — never returns null
- Returns `FounderSettingsDTO` in normalized `{ ok, data, meta }` envelope

### PATCH `/api/aihsafe/founder-settings`

- Auth: same as GET
- Body: `PatchFounderSettingsRequest` — all 7 fields optional; at least 1 required
- `defaultVisibilityScope` restricted to `["family", "trust_unit", "extended_trust"]` — `public_approved` cannot be a network default
- Upserts the singleton row, stamps `founderUserId` with the acting user's ID
- Emits `FOUNDER_SETTINGS_UPDATED` audit event (fire-and-forget)
- Returns updated `FounderSettingsDTO`

## 4. Persisted Settings Implemented

All 7 fields from Agent 37's `AihFounderSettings` schema are live:

| Field | Type | Default | UI Control |
|---|---|---|---|
| `requireGuardianApprovalForMinors` | boolean | `true` | Toggle |
| `allowMinorPosting` | boolean | `true` | Toggle |
| `allowMinorInvites` | boolean | `false` | Toggle |
| `allowMinorExternalLinks` | boolean | `false` | Toggle |
| `defaultVisibilityScope` | string | `"family"` | Dropdown (3 options) |
| `enableTrustedAdults` | boolean | `true` | Toggle |
| `enablePrivateThreads` | boolean | `true` | Toggle |

## 5. UI Wiring Completed

**`FounderSettingsEditor`** replaces the old static `FounderSettingsPreview` card in the Settings tab.

Features:
- Loads live values from `GET /api/aihsafe/founder-settings` on mount
- Loading skeleton (7 placeholder rows) while fetch is in flight
- Each toggle/select calls `PATCH` immediately on change (optimistic update)
- `founderUserId` stamped in DB on every write
- Save state indicator: `Saving…` → `✓ Saved` → fades out after 2.2s
- Error state: rollback optimistic update + show "Save failed" + reload from server
- Retry button when initial load fails
- Sections: "Minor protection" (4 fields) + "Network defaults" (3 fields)
- Settings tab is only visible to `shellMode === "founder"` — children and members never see it (enforced by `FamilySafeTabs.getVisibleTabs`)

## 6. Founder-Only Enforcement

Two layers:

**API layer (server-enforced):**
```typescript
if (user.role !== "founder" && user.role !== "admin") {
  return forbidden("Only founders and admins can read governance settings.");
}
```
Any non-founder/admin request to either endpoint returns `403 FORBIDDEN`.

**UI layer (defense-in-depth, not security boundary):**
- `FamilySafeTabs.getVisibleTabs()` only includes `"settings"` tab for `shellMode === "founder"`
- `FounderShell` only renders `<FounderSettingsEditor />` inside `shellMode === "founder"` guard
- `shellMode` is derived server-side from `user.role` + `dateOfBirth` — children and members never receive `shellMode = "founder"`

## 7. Policy Integration Coverage

`resolvePolicyProfile()` (from Agent 37) already calls `loadFounderSettings()` internally using `prisma.aihFounderSettings.findFirst()`. Once the GET endpoint auto-creates the singleton row on first call, subsequent policy resolution will pick up the live founder settings.

**Before Agent 39:** `AihFounderSettings` row did not exist → `resolvePolicyProfile()` fell back to `PolicySourceType.SYSTEM_DEFAULT` for all users.

**After Agent 39:** Founder visits Settings tab → GET auto-creates the row → all future `resolvePolicyProfile()` calls read the row → policy uses `PolicySourceType.FOUNDER_DEFAULT` with the configured values.

The following policy fields are now live-configurable:

| Founder field | Policy field affected | Tiers |
|---|---|---|
| `requireGuardianApprovalForMinors` | `posting.requiresGuardianApproval`, `escalation.*` | CHILD, PRETEEN, TEEN |
| `allowMinorPosting` | `posting.allowed` | CHILD, PRETEEN, TEEN |
| `allowMinorInvites` | `invite.allowed` | CHILD, PRETEEN, TEEN |
| `defaultVisibilityScope` | `visibility.defaultScope` | ADULT, ELDER |

`enableTrustedAdults` and `enablePrivateThreads` are persisted but not yet consumed by policy resolution — reserved for Agent 40/41 UI features.

## 8. Remaining Hardcoded Governance Paths

| Path | Detail | Owner |
|---|---|---|
| Governance kernel gates | `canPostContent()`, `canInviteToTrustUnit()`, etc. are pure functions that do not consult founder settings | Future — kernel must stay deterministic |
| Activity/invites API routes | Do not call `resolvePolicyProfile()` before kernel calls — policy layer is not enforced at route level | Future Agent |
| `allowMinorExternalLinks` | Persisted, toggle-able, but no enforcement code exists yet | Agent 41 |
| `enableTrustedAdults` | Persisted, toggle-able, but no guardian-link UI gate uses this flag | Future Agent |
| `enablePrivateThreads` | Persisted, toggle-able, but trust-unit creation does not check this flag | Future Agent |
| `interestsPolicy` blob | Always `null` → `allowedCategoryIds: []` | Agent 40 |
| `limitsPolicy` blob | Always `null` → limits not enforced | Agent 41 |

## 9. Validation Results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ No TypeScript errors |
| `npm run build` | ✅ Build succeeded |
| No schema changes | ✅ Confirmed — `prisma/schema.prisma` not modified |
| No unrelated routes modified | ✅ Confirmed |
| Singleton upsert pattern | ✅ Uses hardcoded `id: "singleton"` — no race condition possible on first-call create |
