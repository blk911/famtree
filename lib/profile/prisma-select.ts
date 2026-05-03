/**
 * Explicit Profile column selections — avoids 500s when DB has not applied migrations that add
 * optional columns (e.g. `phone`) Prisma would otherwise SELECT via relation `include`.
 */

export const PROFILE_SCALAR_SELECT = {
  id: true,
  userId: true,
  bio: true,
  familyRole: true,
  location: true,
  coverUrl: true,
  isPublicInTree: true,
  showDob: true,
  dashboardProfilePromptDismissedAt: true,
  dashboardProfilePromptSeenCount: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** Profile row joined with author fields — vault / feed post cards */
export const PROFILE_FEED_SELECT = {
  ...PROFILE_SCALAR_SELECT,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      photoUrl: true,
    },
  },
} as const;

/** GET /api/profile — nested user + photos gallery */
export const PROFILE_PAGE_SELECT = {
  ...PROFILE_SCALAR_SELECT,
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      photoUrl: true,
      dateOfBirth: true,
      role: true,
      createdAt: true,
      emailVerified: true,
    },
  },
  photos: { orderBy: { createdAt: "desc" as const } },
} as const;
