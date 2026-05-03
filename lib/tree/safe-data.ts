import { prisma } from "@/lib/db/prisma";
import { getTrustUnits } from "@/lib/trust";

/** Tree page / dashboard: prefs table may not exist until migrations run */
export async function loadTreeViewPrefsSafe(viewerId: string) {
  try {
    return await prisma.treeViewPreference.findMany({
      where: { viewerId },
      select: { targetId: true, muted: true, hidden: true },
    });
  } catch (err) {
    console.error("[tree] TreeViewPreference query failed", err);
    return [];
  }
}

/** Trust-unit SQL touches multiple tables; tolerate missing migrations */
export async function loadTrustUnitsSafe(userId: string) {
  try {
    return await getTrustUnits(userId);
  } catch (err) {
    console.error("[tree] getTrustUnits failed", err);
    return [];
  }
}
