// AIH Safe — Canonical interest category definitions.
//
// Categories are the child-facing "topics" that children select when posting.
// Neutral language only — no restriction framing exposed at this layer.
//
// Network-wide allowlist persistence:
//   This pass stores the founder's enabled-category set in localStorage on the
//   client (see CategoryAllowlistPanel). Server-side persistence requires adding
//   an `allowedCategoryIds Json?` column to AihFounderSettings — tracked for a
//   future agent (see docs/aihsafe/interests-category-policy.md §Persistence).
//
// Per-user allowedCategoryIds:
//   Stored in AihPolicyProfile.interestsPolicy.allowedCategoryIds (Agent 37 schema).
//   Empty array = all network-wide enabled categories are available to this user.
//   Non-empty = explicit per-user restriction (guardian override — Agent 41+).

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InterestCategory {
  /** Stable slug — safe to persist in DB or localStorage. Never rename. */
  id:          string;
  label:       string;
  emoji:       string;
  description: string;
}

// ─── Canonical category list ──────────────────────────────────────────────────

export const INTEREST_CATEGORIES: readonly InterestCategory[] = [
  {
    id:          "family",
    label:       "Family",
    emoji:       "👨‍👩‍👧",
    description: "Family moments, milestones, and memories",
  },
  {
    id:          "school",
    label:       "School",
    emoji:       "📚",
    description: "Learning, projects, and school life",
  },
  {
    id:          "sports",
    label:       "Sports",
    emoji:       "⚽",
    description: "Games, practices, and athletic achievements",
  },
  {
    id:          "hobbies",
    label:       "Hobbies",
    emoji:       "🎨",
    description: "Personal interests, crafts, and activities",
  },
  {
    id:          "community",
    label:       "Faith & Community",
    emoji:       "🤝",
    description: "Community events, service, and shared values",
  },
  {
    id:          "pets",
    label:       "Pets",
    emoji:       "🐾",
    description: "Animal friends and pet care",
  },
  {
    id:          "travel",
    label:       "Travel",
    emoji:       "✈️",
    description: "Trips, adventures, and places visited",
  },
  {
    id:          "creative",
    label:       "Creative Projects",
    emoji:       "✏️",
    description: "Art, music, writing, and creative work",
  },
  {
    id:          "wellness",
    label:       "Health & Wellness",
    emoji:       "💪",
    description: "Fitness, activities, and healthy choices",
  },
  {
    id:          "celebrate",
    label:       "Celebrations",
    emoji:       "🎉",
    description: "Birthdays, achievements, and special occasions",
  },
] as const;

/** All category IDs in canonical order. */
export const ALL_CATEGORY_IDS: readonly string[] = INTEREST_CATEGORIES.map((c) => c.id);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Look up a category by its stable ID. Returns undefined for unknown IDs. */
export function getCategoryById(id: string): InterestCategory | undefined {
  return INTEREST_CATEGORIES.find((c) => c.id === id);
}

/**
 * Return the categories permitted for display.
 *
 * @param allowedIds
 *   - Empty array (default) → all categories are available (no restriction).
 *   - Non-empty → only the listed IDs are returned, in canonical order.
 *
 * Unknown IDs in allowedIds are silently ignored (stale config safety).
 */
export function getAllowedCategories(
  allowedIds: readonly string[],
): readonly InterestCategory[] {
  if (allowedIds.length === 0) return INTEREST_CATEGORIES;
  const set = new Set(allowedIds);
  return INTEREST_CATEGORIES.filter((c) => set.has(c.id));
}
