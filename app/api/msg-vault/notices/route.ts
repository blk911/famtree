// GET /api/msg-vault/notices — list for current user

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { ok, unauthenticated, validationFail } from "@/lib/aihsafe/api/envelopes";
import { handleMsgVaultError } from "@/lib/msg-vault/route-utils";
import { listNoticesForUser } from "@/lib/msg-vault/notices";
import { MsgNoticeStatus } from "@/types/msg-vault";

const VALID_STATUS = new Set<string>(Object.values(MsgNoticeStatus));

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const raw = new URL(req.url).searchParams.get("status");
    let statusFilter: (typeof MsgNoticeStatus)[keyof typeof MsgNoticeStatus] | undefined;
    if (raw) {
      if (!VALID_STATUS.has(raw)) {
        return validationFail("Invalid status filter.");
      }
      statusFilter = raw as typeof statusFilter;
    }

    const { items, unreadCount } = await listNoticesForUser(user.id, statusFilter);
    return ok({ items, unreadCount });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return unauthenticated();
    }
    return handleMsgVaultError(err);
  }
}
