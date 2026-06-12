import {
  ensureTaikosStorageTables,
  prisma,
  resolveTaikosStorageBackend,
  taikosDatabaseUrlPresent,
} from "@/lib/taikos/storage/taikos-db";

export type TaikosStorageStats = {
  backend: "postgres" | "json";
  durable: boolean;
  databaseUrlPresent: boolean;
  databaseConnected: boolean;
  vercel: boolean;
  queueCount: number;
  draftCount: number;
  goalCount: number;
  activityCount: number;
  sessionCount: number;
  note: string | null;
};

export async function probeTaikosDatabaseConnected(): Promise<boolean> {
  if (!taikosDatabaseUrlPresent()) return false;
  try {
    await ensureTaikosStorageTables();
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export async function getTaikosStorageStats(): Promise<TaikosStorageStats> {
  const backend = await resolveTaikosStorageBackend();
  const databaseUrlPresent = taikosDatabaseUrlPresent();
  const databaseConnected = await probeTaikosDatabaseConnected();
  const vercel = Boolean(process.env.VERCEL);

  const empty: TaikosStorageStats = {
    backend,
    durable: backend === "postgres",
    databaseUrlPresent,
    databaseConnected,
    vercel,
    queueCount: 0,
    draftCount: 0,
    goalCount: 0,
    activityCount: 0,
    sessionCount: 0,
    note:
      vercel && backend !== "postgres"
        ? "tAIkOS requires Postgres on Vercel — set DATABASE_URL and redeploy."
        : null,
  };

  if (backend !== "postgres" || !databaseConnected) return empty;

  try {
    const [queueRow, draftRow, goalRow, activityRow, sessionRow] = await Promise.all([
      prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM taikos_queue_item`,
      prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM taikos_draft`,
      prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM taikos_goal`,
      prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM taikos_activity`,
      prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM taikos_session`,
    ]);

    return {
      ...empty,
      queueCount: Number(queueRow[0]?.count ?? 0),
      draftCount: Number(draftRow[0]?.count ?? 0),
      goalCount: Number(goalRow[0]?.count ?? 0),
      activityCount: Number(activityRow[0]?.count ?? 0),
      sessionCount: Number(sessionRow[0]?.count ?? 0),
    };
  } catch {
    return empty;
  }
}
