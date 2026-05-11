# AIH Safe — Interest Category Policy

## Overview

The interest category system provides a curated, founder-controlled set of topics that children can attach to their posts. Categories are a UI-level tagging layer on top of the core governance policy stack — they do not alter posting permissions but let founders filter what topics are visible to minor accounts.

---

## Category registry

Ten canonical categories are defined in `lib/aihsafe/interests/categories.ts`. They are **static** (no DB table) and identified by stable string IDs. The registry is the single source of truth; categories are never created, edited, or deleted at runtime.

```
family  | school  | sports  | hobbies  | community
pets    | travel  | creative | wellness | celebrate
```

---

## Founder allowlist

Founders control which categories are available to children network-wide via the **Category Allowlist Panel** in Founder Settings.

### Current persistence (Phase 1)
- Stored in browser `localStorage` under key `aihsafe_founder_allowed_categories`
- JSON string array of enabled category IDs
- Missing key → all 10 categories enabled (safe default)
- Per-device; not synced across founder's devices

### Planned persistence (Phase 2)
- Add `allowedCategoryIds Json?` column to `AihFounderSettings`
- Serve via existing `GET /api/aihsafe/founder-settings`
- Accept via existing `PATCH /api/aihsafe/founder-settings`

---

## Child-facing topic picker

When `PostComposer` is rendered with `viewerMode="child"`, a row of category chips appears between the space picker and the textarea. The rendered set is derived from `getAllowedCategories(allowedCategoryIds)`:

```
getAllowedCategories([])              → all 10 categories (no filter)
getAllowedCategories(["family","pets"]) → only those two
```

Category selection is single-select, toggleable (click again to deselect). It resets on successful post submission.

**Phase 1 limitation:** The selected category is not submitted to the API. The `ActivityPost` model has no `categoryId` column yet.

---

## `allowedCategoryIds` semantics in policy

`InterestsPolicy.allowedCategoryIds` (part of `ResolvedPolicyProfile`) follows a consistent convention:

| Value | Meaning |
|-------|---------|
| `[]` (empty) | No per-user restriction — all network-wide enabled categories apply |
| `["family", "pets"]` | Guardian per-user restriction to the listed IDs |

This mirrors the `allowedScopes` pattern in `PostingPolicy` and `VisibilityPolicy`. The guardian per-user override path is reserved for **Agent 41+**.

---

## Data flow (Phase 1)

```
Founder toggles category in CategoryAllowlistPanel
  └─► writeToStorage(enabledIds)  →  localStorage["aihsafe_founder_allowed_categories"]

Child opens PostComposer (viewerMode="child", allowedCategoryIds=[])
  └─► getAllowedCategories([])  →  all 10 categories (no active filter this pass)

Child selects a category chip
  └─► setSelectedCategoryId(cat.id)   [UI state only]

Child submits post
  └─► createActivityPost({ bodyText, trustUnitId, visibilityScope })
      [categoryId NOT included — no API/schema support yet]
  └─► setSelectedCategoryId(null)     [reset on success]
```

---

## Roadmap

| Agent | Scope |
|-------|-------|
| 40 (done) | Registry, founder localStorage toggle, child chip row |
| 41 | Server-persist founder allowlist; submit `categoryId` with posts; render on PostCard |
| 42+ | Per-child guardian override of `allowedCategoryIds`; category-based feed filter |
