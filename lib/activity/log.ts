// lib/activity/log.ts
// Thin wrapper — call from any server-side route to append an audit entry.

import { prisma } from "@/lib/db/prisma";

export async function logActivity({
  actorId,
  actorName,
  action,
  detail,
}: {
  actorId: string;
  actorName: string;
  action: string;
  detail: string;
}) {
  try {
    await (prisma as any).activityLog.create({
      data: { actorId, actorName, action, detail },
    });
  } catch {
    // Never let logging break the main request
  }
}
