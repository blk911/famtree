import { prisma } from "@/lib/db/prisma";

/** Reads mobile only when the `phone` column exists; otherwise null (pre-migration DBs). */
export async function getProfilePhoneSafe(userId: string): Promise<string | null> {
  try {
    const row = await prisma.profile.findUnique({
      where: { userId },
      select: { phone: true },
    });
    return row?.phone ?? null;
  } catch {
    return null;
  }
}
