import type { CardPreviewModel } from "@/lib/vmb/cards/card-preview-model";

/** Serializable payload safe for recipient browsers — no salon trial ids or operator fields. */
export type RecipientInviteClientView = {
  inviteId: string;
  draftId: string;
  salonDisplayName: string;
  techName?: string;
  previewModel: CardPreviewModel;
  primaryCta: string;
  claimHref: string;
};

export type RecipientInvitePageState =
  | { status: "available"; view: RecipientInviteClientView }
  | { status: "expired"; inviteId: string; message: string }
  | { status: "not_found"; inviteId: string };

const ADMIN_LEAK_KEYS = [
  "salonId",
  "trialId",
  "operatorId",
  "analysisId",
  "email",
  "phone",
  "estimatedValue",
  "linkedGoalId",
  "sourcePage",
  "payload",
  "audit",
  "lockedFooter",
  "candidateScore",
  "potentialValue",
  "recipientContactHash",
] as const;

export function assertNoAdminFieldsInRecipientPayload(value: unknown, path = "root"): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoAdminFieldsInRecipientPayload(item, `${path}[${index}]`));
    return;
  }
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if ((ADMIN_LEAK_KEYS as readonly string[]).includes(key)) {
      throw new Error(`Admin field leaked at ${path}.${key}`);
    }
    assertNoAdminFieldsInRecipientPayload((value as Record<string, unknown>)[key], `${path}.${key}`);
  }
}

export function toRecipientInvitePageState(input: {
  inviteId: string;
  draftId: string;
  salonDisplayName: string;
  techName?: string;
  previewModel: CardPreviewModel;
  primaryCta: string;
}): RecipientInvitePageState {
  const view: RecipientInviteClientView = {
    inviteId: input.inviteId,
    draftId: input.draftId,
    salonDisplayName: input.salonDisplayName,
    techName: input.techName,
    previewModel: input.previewModel,
    primaryCta: input.primaryCta,
    claimHref: `/vmb/invite/${encodeURIComponent(input.inviteId)}/claim`,
  };
  assertNoAdminFieldsInRecipientPayload(view);
  return { status: "available", view };
}
