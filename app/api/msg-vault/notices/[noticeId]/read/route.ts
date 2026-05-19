// POST /api/msg-vault/notices/[noticeId]/read — mark notice read

export const dynamic = "force-dynamic";

import { requireAuth } from "@/lib/auth";
import { ok, unauthenticated, validationFail } from "@/lib/aihsafe/api/envelopes";
import { handleMsgVaultError } from "@/lib/msg-vault/route-utils";
import { markNoticeRead } from "@/lib/msg-vault/notices";
import { parseDerivedNoticeId } from "@/lib/msg-vault/notices/refs";

type RouteCtx = { params: Promise<{ noticeId: string }> };

export async function POST(_req: Request, routeCtx: RouteCtx) {
  try {
    const user = await requireAuth();
    const { noticeId } = await routeCtx.params;
    if (!noticeId?.trim()) {
      return validationFail("Notice id is required.");
    }

    const notice = await markNoticeRead(user.id, noticeId);
    const id =
      parseDerivedNoticeId(noticeId) && notice.id !== noticeId ? noticeId : notice.id;
    return ok({ notice: { ...notice, id } });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return unauthenticated();
    }
    return handleMsgVaultError(err);
  }
}
