// GET  /api/msg-vault/conversations — list for current user
// POST /api/msg-vault/conversations — create direct or thread

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { readJson } from "@/lib/aihsafe/api/parse";
import { created, ok, unauthenticated, validationFail } from "@/lib/aihsafe/api/envelopes";
import { handleMsgVaultError } from "@/lib/msg-vault/route-utils";
import {
  createDirectConversation,
  createThreadConversation,
  listAllowedChatContacts,
  listConversationsForUser,
} from "@/lib/msg-vault/conversations";
import { MsgConversationKind } from "@/types/msg-vault";

const CreateConversationSchema = z.discriminatedUnion("type", [
  z.object({
    type:          z.literal("direct"),
    targetUserId:  z.string().min(1),
  }),
  z.object({
    type:                z.literal("thread"),
    trustUnitId:         z.string().min(1),
    participantUserIds:  z.array(z.string().min(1)).default([]),
    title:               z.string().max(120).optional(),
    kind:                z.enum(["THREAD", "SPACE_THREAD"]).optional(),
    visibilityScope:     z.string().optional(),
  }),
]);

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const allowedContacts = new URL(req.url).searchParams.get("allowedContacts");
    if (allowedContacts === "1" || allowedContacts === "true") {
      const contacts = await listAllowedChatContacts(user.id);
      return ok({ contacts });
    }
    const items = await listConversationsForUser(user.id);
    return ok({ items });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return unauthenticated();
    }
    return handleMsgVaultError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await readJson(req);
    const parsed = CreateConversationSchema.safeParse(body);
    if (!parsed.success) {
      return validationFail("Invalid request body. Use type direct or thread.");
    }

    const data = parsed.data;
    if (data.type === "direct") {
      const conversation = await createDirectConversation(user.id, data.targetUserId);
      return created({ conversation });
    }

    const conversation = await createThreadConversation(user.id, {
      trustUnitId:        data.trustUnitId,
      participantUserIds: data.participantUserIds,
      title:              data.title,
      kind:               data.kind ?? MsgConversationKind.THREAD,
      visibilityScope:    data.visibilityScope as never,
    });
    return created({ conversation });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return unauthenticated();
    }
    return handleMsgVaultError(err);
  }
}
