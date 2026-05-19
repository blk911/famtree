// GET /api/msg-vault/conversations/[conversationId]

export const dynamic = "force-dynamic";

import { requireAuth } from "@/lib/auth";
import { ok, unauthenticated, validationFail } from "@/lib/aihsafe/api/envelopes";
import { handleMsgVaultError } from "@/lib/msg-vault/route-utils";
import { buildGovernanceOverlay, buildRelationshipContext } from "@/lib/msg-vault/context";
import { prisma } from "@/lib/db/prisma";
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
    const [governanceOverlay, relationshipContext, founder] = await Promise.all([
      buildGovernanceOverlay(user.id, conversationId),
      buildRelationshipContext(user.id, conversationId),
      prisma.aihFounderSettings.findFirst({ select: { enablePrivateThreads: true } }),
    ]);

    const trustUnit = row.trustUnit
      ? {
          id: row.trustUnit.id,
          name: row.trustUnit.aihMeta?.name ?? row.title ?? null,
          description: row.trustUnit.aihMeta?.description ?? null,
          vaultSpaceType: row.trustUnit.aihMeta?.vaultSpaceType ?? null,
          defaultVisibilityScope:
            row.trustUnit.aihMeta?.defaultVisibilityScope ?? null,
        }
      : null;

    return ok({
      conversation: toConversationDTO(row, row.participants),
      participants: row.participants.map(toParticipantDTO),
      governanceOverlay,
      relationshipContext,
      trustUnit,
      privateThreadsEnabled: founder?.enablePrivateThreads ?? true,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return unauthenticated();
    }
    return handleMsgVaultError(err);
  }
}
