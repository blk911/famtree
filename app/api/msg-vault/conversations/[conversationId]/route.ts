// GET /api/msg-vault/conversations/[conversationId]

export const dynamic = "force-dynamic";

import { requireAuth } from "@/lib/auth";
import { ok, unauthenticated, validationFail } from "@/lib/aihsafe/api/envelopes";
import { handleMsgVaultError } from "@/lib/msg-vault/route-utils";
import { buildGovernanceOverlay } from "@/lib/msg-vault/context";
import { toConversationDTO, toParticipantDTO } from "@/lib/msg-vault/mappers";
import { loadConversationForParticipant } from "@/lib/msg-vault/access";

type RouteCtx = { params: Promise<{ conversationId: string }> };

export async function GET(_req: Request, routeCtx: RouteCtx) {
  try {
    const user = await requireAuth();
    const { conversationId } = await routeCtx.params;
    if (!conversationId?.trim()) {
      return validationFail("Conversation id is required.");
    }

    const row = await loadConversationForParticipant(user.id, conversationId);
    const governanceOverlay = await buildGovernanceOverlay(user.id, conversationId);

    return ok({
      conversation: toConversationDTO(row),
      participants: row.participants.map(toParticipantDTO),
      governanceOverlay,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return unauthenticated();
    }
    return handleMsgVaultError(err);
  }
}
