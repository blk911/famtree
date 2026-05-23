// GET /api/msg-vault/conversations/[conversationId]

export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { ok, unauthenticated, validationFail } from "@/lib/aihsafe/api/envelopes";
import { handleMsgVaultError } from "@/lib/msg-vault/route-utils";
import { buildGovernanceOverlay, buildRelationshipContext } from "@/lib/msg-vault/context";
import { prisma } from "@/lib/db/prisma";
import { toConversationDTO, toParticipantDTO } from "@/lib/msg-vault/mappers";
import { loadConversationForParticipant } from "@/lib/msg-vault/access";
import {
  archiveConversationForUser,
  resumeConversationForUser,
} from "@/lib/msg-vault/conversations";
import { readJson } from "@/lib/aihsafe/api/parse";
import { z } from "zod";

type RouteCtx = { params: Promise<{ conversationId: string }> };

const PatchConversationSchema = z.object({
  action: z.enum(["archive", "resume"]),
});

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

    const myParticipant = row.participants.find((p) => p.userId === user.id);
    return ok({
      conversation: {
        ...toConversationDTO(row, row.participants),
        archivedForViewer: myParticipant?.archivedAt != null,
      },
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

export async function PATCH(req: NextRequest, routeCtx: RouteCtx) {
  try {
    const user = await requireAuth();
    const { conversationId } = await routeCtx.params;
    if (!conversationId?.trim()) {
      return validationFail("Conversation id is required.");
    }

    const body = await readJson(req);
    const parsed = PatchConversationSchema.safeParse(body);
    if (!parsed.success) {
      return validationFail("Use action archive or resume.");
    }

    const conversation =
      parsed.data.action === "archive"
        ? await archiveConversationForUser(user.id, conversationId)
        : await resumeConversationForUser(user.id, conversationId);

    return ok({ conversation });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return unauthenticated();
    }
    return handleMsgVaultError(err);
  }
}
