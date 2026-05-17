import type { Prisma } from "@prisma/client";

/**
 * Posts the viewer is allowed to see on the dashboard / open family feed.
 * Server-side only — never infer visibility from the client list alone.
 */
export function dashboardFeedWhere(viewerId: string): Prisma.PostWhereInput {
  return {
    OR: [
      { profile: { userId: viewerId } },
      // Family-wide: explicit scope, no per-recipient rows.
      { scope: "FAMILY", visibility: { none: {} } },
      // Legacy rows before scope migration: FAMILY default + visibility meant “sub-thread”.
      {
        AND: [
          { scope: "FAMILY" },
          { visibility: { some: {} } },
          {
            OR: [
              { profile: { userId: viewerId } },
              { visibility: { some: { userId: viewerId } } },
            ],
          },
        ],
      },
      {
        scope: "PRIVATE",
        OR: [
          { visibility: { some: { userId: viewerId } } },
          { profile: { userId: viewerId } },
        ],
      },
      {
        scope: { in: ["BUSINESS", "CLUB", "CHURCH"] },
        spaceId: { not: null },
        space: {
          members: { some: { userId: viewerId } },
        },
      },
    ],
  };
}
