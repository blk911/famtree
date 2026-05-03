import { prisma } from "@/lib/db/prisma";

/** Dashboard onboarding banner — columns may be missing on unmigrated DBs */
export async function queryDashboardProfilePrompt(userId: string) {
  try {
    return await prisma.$queryRaw<
      Array<{
        dashboardProfilePromptDismissedAt: Date | null;
        dashboardProfilePromptSeenCount: number;
      }>
    >`
      SELECT "dashboardProfilePromptDismissedAt", "dashboardProfilePromptSeenCount"
      FROM "profiles" WHERE "userId" = ${userId} LIMIT 1
    `;
  } catch (err) {
    console.error("[dashboard] profile prompt query failed", err);
    return [];
  }
}

export async function incrementDashboardProfilePromptSeen(userId: string) {
  try {
    await prisma.$executeRaw`
      UPDATE "profiles"
      SET "dashboardProfilePromptSeenCount" = "dashboardProfilePromptSeenCount" + 1,
          "updatedAt" = now()
      WHERE "userId" = ${userId}
    `;
  } catch (err) {
    console.error("[dashboard] profile prompt increment failed", err);
  }
}
