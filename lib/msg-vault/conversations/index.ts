// Msg Vault — conversation services (Agent 50).

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { buildActorContext } from "@/lib/aihsafe/context/buildActorContext";
import { canMessage } from "@/lib/aihsafe/governance";
import { listMembersForTrustUnit } from "@/lib/aihsafe/graph";
import { resolvePolicyProfile } from "@/lib/aihsafe/policy/resolvePolicyProfile";
import { asAIHUserId, asTrustUnitId } from "@/types/aihsafe/ids";
import { VisibilityScope } from "@/types/aihsafe/visibility";
import { makeDirectConversationKey } from "@/lib/msg-vault/directKey";
import { sharedTrustUnitIdsBetween } from "@/lib/msg-vault/graph";
import {
  assertTargetUserActive,
  loadConversationForParticipant,
  PARTICIPANT_INCLUDE,
  requireActiveParticipant,
} from "@/lib/msg-vault/access";
import { notFound, validationError, accessDenied } from "@/lib/msg-vault/errors";
import { toConversationDTO, toParticipantDTO } from "@/lib/msg-vault/mappers";
import type {
  CreateThreadConversationInput,
  MsgConversationDTO,
  MsgParticipantDTO,
} from "@/types/msg-vault";
import { MsgConversationKind } from "@/types/msg-vault";

export async function listConversationsForUser(userId: string): Promise<MsgConversationDTO[]> {
  const rows = await prisma.aihMsgParticipant.findMany({
    where: { userId, status: "ACTIVE" },
    include: {
      conversation: {
        include: {
          participants: {
            where: { status: "ACTIVE" },
            include: PARTICIPANT_INCLUDE,
            take: 8,
          },
        },
      },
    },
    orderBy: [
      { conversation: { lastMessageAt: "desc" } },
      { conversation: { updatedAt: "desc" } },
    ],
  });

  return rows.map((row) =>
    toConversationDTO(row.conversation, row.conversation.participants),
  );
}

export async function getConversationById(
  conversationId: string,
  viewerUserId: string,
): Promise<MsgConversationDTO | null> {
  try {
    const row = await loadConversationForParticipant(viewerUserId, conversationId);
    return toConversationDTO(row, row.participants);
  } catch (e) {
    if (e instanceof Error && "status" in e && (e as { status: number }).status === 404) {
      return null;
    }
    throw e;
  }
}

export async function listParticipants(conversationId: string): Promise<MsgParticipantDTO[]> {
  const rows = await prisma.aihMsgParticipant.findMany({
    where: { conversationId, status: "ACTIVE" },
    include: PARTICIPANT_INCLUDE,
    orderBy: { joinedAt: "asc" },
  });
  return rows.map(toParticipantDTO);
}

export async function createDirectConversation(
  actorUserId: string,
  targetUserId: string,
): Promise<MsgConversationDTO> {
  if (actorUserId === targetUserId) {
    throw validationError("You cannot start a direct chat with yourself.");
  }

  await assertTargetUserActive(targetUserId);

  const actor = await buildActorContext(asAIHUserId(actorUserId));
  const shared = await sharedTrustUnitIdsBetween(actor, targetUserId);
  const decision = canMessage(actor, {
    targetUserId: asAIHUserId(targetUserId),
    sharedTrustUnitIds: shared,
  });
  if (!decision.allowed) {
    throw accessDenied(
      decision.reason ||
        "You may only message people you share a trust relationship with.",
    );
  }

  const directKey = makeDirectConversationKey(actorUserId, targetUserId);
  const existing = await prisma.aihMsgConversation.findUnique({
    where: { directKey },
    include: {
      participants: { where: { status: "ACTIVE" }, include: PARTICIPANT_INCLUDE },
    },
  });
  if (existing) {
    return toConversationDTO(existing, existing.participants);
  }

  const policy = await resolvePolicyProfile(actorUserId);
  const visibilityScope =
    shared.length > 0 ? VisibilityScope.TRUST_UNIT : VisibilityScope.GUARDIAN_ONLY;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const conversation = await tx.aihMsgConversation.create({
        data: {
          kind:            "DIRECT",
          directKey,
          createdById:     actorUserId,
          visibilityScope,
          status:          "ACTIVE",
          policySnapshot: {
            sourceType:      policy.sourceType,
            visibilityScope,
            sharedTrustUnitIds: shared,
            createdAt:       new Date().toISOString(),
          } as Prisma.InputJsonValue,
          participants: {
            create: [
              { userId: actorUserId, role: "OWNER", status: "ACTIVE" },
              { userId: targetUserId, role: "PARTICIPANT", status: "ACTIVE" },
            ],
          },
        },
        include: {
          participants: { include: PARTICIPANT_INCLUDE },
        },
      });
      return conversation;
    });

    return toConversationDTO(created, created.participants);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const raced = await prisma.aihMsgConversation.findUnique({
        where: { directKey },
        include: {
          participants: { where: { status: "ACTIVE" }, include: PARTICIPANT_INCLUDE },
        },
      });
      if (raced) return toConversationDTO(raced, raced.participants);
    }
    throw err;
  }
}

export async function createThreadConversation(
  actorUserId: string,
  input: CreateThreadConversationInput,
): Promise<MsgConversationDTO> {
  const trustUnitId = input.trustUnitId?.trim();
  if (!trustUnitId) {
    throw validationError("A trust unit is required to create a thread.");
  }

  const founder = await prisma.aihFounderSettings.findFirst({
    select: { enablePrivateThreads: true },
  });
  if (founder && !founder.enablePrivateThreads) {
    throw validationError("Private threads are disabled on this network.");
  }

  const actor = await buildActorContext(asAIHUserId(actorUserId));
  const isMember = actor.memberships.some(
    (m) => (m.trustUnitId as string) === trustUnitId && m.exitedAt === null,
  );
  if (!isMember) {
    throw validationError("You must be a member of this trust unit to start a thread.");
  }

  const tuMembers = await listMembersForTrustUnit(asTrustUnitId(trustUnitId));
  const tuMemberIds = new Set(tuMembers.map((m) => m.userId as string));

  const requested = new Set(input.participantUserIds.map((id) => id.trim()).filter(Boolean));
  requested.add(actorUserId);

  if (requested.size < 2) {
    throw validationError("Select at least one other participant.");
  }

  for (const id of Array.from(requested)) {
    if (!tuMemberIds.has(id)) {
      throw validationError("All participants must be members of the trust unit.");
    }
  }

  const trustUnit = await prisma.trustUnit.findUnique({
    where: { id: trustUnitId },
    include: { aihMeta: true },
  });
  if (!trustUnit || trustUnit.status !== "ACTIVE") {
    throw notFound("Trust unit not found.");
  }

  const policy = await resolvePolicyProfile(actorUserId);
  const visibilityScope = input.visibilityScope ?? VisibilityScope.TRUST_UNIT;
  const kind =
    input.kind === MsgConversationKind.SPACE_THREAD
      ? MsgConversationKind.SPACE_THREAD
      : MsgConversationKind.THREAD;

  const title =
    input.title?.trim() ||
    trustUnit.aihMeta?.name ||
    "Private thread";

  const created = await prisma.aihMsgConversation.create({
    data: {
      kind,
      title,
      createdById:    actorUserId,
      trustUnitId,
      visibilityScope,
      status:         "ACTIVE",
      policySnapshot: {
        sourceType:      policy.sourceType,
        visibilityScope,
        trustUnitId,
        participantIds:  Array.from(requested),
        createdAt:       new Date().toISOString(),
      } as Prisma.InputJsonValue,
      participants: {
        create: Array.from(requested).map((userId) => ({
          userId,
          role:   userId === actorUserId ? "OWNER" : "PARTICIPANT",
          status: "ACTIVE",
        })),
      },
    },
    include: {
      participants: { include: PARTICIPANT_INCLUDE },
    },
  });

  return toConversationDTO(created, created.participants);
}
