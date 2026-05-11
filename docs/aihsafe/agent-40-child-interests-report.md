# Agent 40 — Child Interests / Category Allowlist Foundation

**Branch:** `aihsafe-agent-40-child-interests`  
**Status:** Complete

---

## Deliverables

### 1. Interest category registry (`lib/aihsafe/interests/categories.ts`)

Ten canonical categories, each with a stable `id`, `label`, `emoji`, and `description`:

| ID | Label | Emoji |
|----|-------|-------|
| `family` | Family | 👨‍👩‍👧‍👦 |
| `school` | School | 📚 |
| `sports` | Sports | ⚽ |
| `hobbies` | Hobbies | 🎮 |
| `community` | Community | 🏘️ |
| `pets` | Pets | 🐾 |
| `travel` | Travel | ✈️ |
| `creative` | Creative | 🎨 |
| `wellness` | Wellness | 🌿 |
| `celebrate` | Celebrate | 🎉 |

Key exports:
- `INTEREST_CATEGORIES` — readonly tuple, source of truth
- `ALL_CATEGORY_IDS` — string union of all IDs
- `getCategoryById(id)` — O(n) lookup with undefined return
- `getAllowedCategories(allowedIds)` — returns all enabled categories; empty `allowedIds` = no filter (all pass)

### 2. Founder category allowlist panel (`components/aihsafe/founder/CategoryAllowlistPanel.tsx`)

- Reads/writes to `localStorage` key `aihsafe_founder_allowed_categories` (JSON string array)
- Default: all 10 categories enabled (missing key → full set)
- Hydrates after mount to avoid SSR mismatch; shows "Loading…" during hydration
- "Enable all" shortcut link appears when any category is disabled
- Amber `⚡` notice informs founders that network-wide persistence is a future update
- Integrated at the bottom of `FounderSettingsEditor` under a "Content categories" section header

### 3. Child topic picker in PostComposer (`components/aihsafe/feed/PostComposer.tsx`)

- New `CategoryChip` sub-component (indigo selected state, toggle behavior)
- New prop: `allowedCategoryIds?: string[]` (empty = all enabled categories)
- New state: `selectedCategoryId: string | null`
- Category chip row renders only for `viewerMode === "child"` when at least one category is available
- Category resets to `null` on successful post submission
- **UI-local this pass** — category selection is not submitted to the API; the activity POST route schema does not include a `categoryId` field yet

---

## Architecture decisions

### localStorage for founder allowlist (not DB)

`AihFounderSettings` has no JSON column for category IDs. Adding one requires a schema migration + `db:push` cycle. This pass uses `localStorage` as a fast-follow with an explicit amber warning in the UI. The server-persistence path is:

1. Add `allowedCategoryIds Json?` to `AihFounderSettings` in `prisma/schema.prisma`
2. Run `db:push` + `db:generate`
3. Extend GET/PATCH founder-settings API to read/write the field
4. Replace `readFromStorage`/`writeToStorage` with API calls in `CategoryAllowlistPanel`

### Category selection not submitted to API

The `createActivityPost` API client uses the `POST /api/aihsafe/activity` route. That route's Zod schema currently strips unknown fields, so passing `categoryId` would be a no-op. Wiring category to posts requires:

1. Add `categoryId String?` to the `ActivityPost` Prisma model
2. Extend the activity route's Zod schema to accept `categoryId`
3. Update `PostComposer` to include `selectedCategoryId` in the `createActivityPost` call

### `allowedCategoryIds: []` semantics

The `InterestsPolicy.allowedCategoryIds` field follows the same convention as the broader policy system: empty array = no restriction (all network-wide enabled categories are accessible). A non-empty array would represent a per-user guardian override, planned for Agent 41+.

---

## What is NOT yet done

- Server persistence of founder category allowlist (requires schema change)
- Submitting selected category with posts (requires schema + API change)
- Per-child guardian override of allowed categories (`Agent 41+`)
- Surfacing selected category on rendered `PostCard`
- Category-based feed filtering

---

## Files changed

| File | Change |
|------|--------|
| `lib/aihsafe/interests/categories.ts` | Created — 10-category registry |
| `lib/aihsafe/interests/index.ts` | Created — barrel export |
| `lib/aihsafe/policy/defaults.ts` | Comment updated — `allowedCategoryIds` semantics |
| `components/aihsafe/founder/CategoryAllowlistPanel.tsx` | Created — localStorage-backed toggle panel |
| `components/aihsafe/founder/FounderSettingsEditor.tsx` | Modified — added `CategoryAllowlistPanel` |
| `components/aihsafe/feed/PostComposer.tsx` | Modified — `CategoryChip` + child topic picker |
