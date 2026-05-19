// Msg Vault — governance overlay / explainability (Agent 50).

import { prisma } from "@/lib/db/prisma";
import { buildActorContext } from "@/lib/aihsafe/context/buildActorContext";
import { isMinorTier } from "@/types/aihsafe/age-tiers";
import { asAIHUserId } from "@/types/aihsafe/ids";
import { resolvePolicyProfile } from "@/lib/aihsafe/policy/resolvePolicyProfile";
import { loadConversationForParticipant } from "@/lib/msg-vault/access";
import { notFound } from "@/lib/msg-vault/errors";
import type { GovernanceOverlayDTO, RelationshipContextDTO } from "@/types/msg-vault";

export async function buildGovernanceOverlay(
  userId: string,
  conversationId: string,
): Promise<GovernanceOverlayDTO> {
  const conversation = await loadConversationForParticipant(userId, conversationId);
  const actor = await buildActorContext(asAIHUserId(userId));
  const policy = await resolvePolicyProfile(userId);

  const myParticipant = conversation.participants.find((p) => p.userId === userId);
  const otherParticipants = conversation.participants.filter((p) => p.userId !== userId);

  let visibilityReason = "You are an active participant in this conversation.";

  if (conversation.kind === "DIRECT" && otherParticipants.length === 1) {
    const other = otherParticipants[0]!;
    const name = other.user
      ? `${other.user.firstName} ${other.user.lastName}`.trim()
      : "this member";
    visibilityReason = `Direct chat with ${name} — allowed by your family trust relationships.`;
  } else if (conversation.trustUnitId) {
    const unitName =
      conversation.trustUnit?.aihMeta?.name ?? "your shared trust space";
    visibilityReason = `Thread in trust space "${unitName}".`;
  }

  const guardianOversightActive =
    isMinorTier(actor.ageTier) ||
    actor.guardianRelationships.some((g) =>
      otherParticipants.some((p) => (p.userId as string) === (g.childUserId as string)),
    );

  const founder = await prisma.aihFounderSettings.findFirst({
    select: { allowMinorExternalLinks: true },
  });

  const externalSharingAllowed = isMinorTier(actor.ageTier)
    ? (founder?.allowMinorExternalLinks ?? false)
    : true;

  return {
    visibilityReason,
    visibilityScope: conversation.visibilityScope,
    policySourceType: policy.sourceType,
    guardianOversightActive,
    externalSharingAllowed,
    escalationPending: conversation.status === "PENDING_APPROVAL",
  };
}

export async function explainConversationAccess(
  userId: string,
  conversationId: string,
): Promise<string> {
  const overlay = await buildGovernanceOverlay(userId, conversationId);
  return overlay.visibilityReason;
}

export async function buildRelationshipContext(
  userId: string,
  conversationId: string,
): Promise<RelationshipContextDTO> {
  const conversation = await loadConversationForParticipant(userId, conversationId);
  const actor = await buildActorContext(asAIHUserId(userId));

  const edges: RelationshipContextDTO["edges"] = [];

  if (conversation.trustUnitId && conversation.trustUnit?.aihMeta?.name) {
    edges.push({
      kind:        "trust_unit",
      label:       `Trust space: ${conversation.trustUnit.aihMeta.name}`,
      trustUnitId: conversation.trustUnitId,
    });
  }

  for (const g of actor.guardianRelationships) {
    if (conversation.participants.some((p) => p.userId === (g.childUserId as string))) {
      edges.push({
        kind:          "guardian",
        label:         "Guardian oversight applies",
        relatedUserId: g.childUserId as string,
      });
    }
  }

  return {
    viewerUserId:       userId,
    conversationId,
    edges,
    sharedTrustUnitIds: conversation.trustUnitId ? [conversation.trustUnitId] : [],
    guardianUserIds:    actor.guardedByRelationships.map((g) => g.guardianUserId as string),
    guardedChildUserIds: actor.guardianRelationships.map((g) => g.childUserId as string),
  };
}

export async function getConversationDetailForViewer(
  userId: string,
  conversationId: string,
) {
  const conversation = await loadConversationForParticipant(userId, conversationId);
  if (!conversation) {
    throw notFound();
  }
  const governanceOverlay = await buildGovernanceOverlay(userId, conversationId);
  return { conversation, governanceOverlay };
}
