import type { CardImageLayout } from "@/lib/vmb/cards/card-types";
import type { CardImageSlot, CardPreviewModel } from "@/lib/vmb/cards/card-preview-model";

export type CardBuilderDraftImageSlot = {
  previewUrl?: string;
  fileName?: string;
  /** True when slot 3 was prefilled from salon owner profile — not a local upload. */
  prefilled?: boolean;
};

export const CARD_BUILDER_IMAGE_SLOT_COUNT = 3;

export const CARD_BUILDER_IMAGE_SLOT_LABELS = [
  "Service image 1",
  "Service image 2",
  "Owner photo",
] as const;

export function isCardBuilderImageFile(file: Pick<File, "type">): boolean {
  return file.type.startsWith("image/");
}

/** Draft image slots — slot 3 optionally prefilled from owner profile photo URL. */
export function createInitialCardBuilderImageSlots(ownerPhotoUrl?: string | null): CardBuilderDraftImageSlot[] {
  const ownerUrl = ownerPhotoUrl?.trim();
  return [
    {},
    {},
    ownerUrl
      ? { previewUrl: ownerUrl, fileName: "Profile photo", prefilled: true }
      : {},
  ];
}

/** @deprecated Use createInitialCardBuilderImageSlots */
export const createEmptyCardBuilderImageSlots = createInitialCardBuilderImageSlots;

function slotRole(index: number): CardImageSlot["role"] {
  return index === 2 ? "owner" : "service";
}

function buildPreviewSlotsFromDraft(draftSlots: CardBuilderDraftImageSlot[]): CardImageSlot[] {
  return draftSlots.map((slot, index) => ({
    id: `builder-slot-${index + 1}`,
    label: CARD_BUILDER_IMAGE_SLOT_LABELS[index] ?? `Slot ${index + 1}`,
    previewUrl: slot.previewUrl?.trim() || undefined,
    role: slotRole(index),
  }));
}

function countFilledSlots(draftSlots: CardBuilderDraftImageSlot[]): number {
  return draftSlots.filter((slot) => Boolean(slot.previewUrl?.trim())).length;
}

function resolveBuilderImageLayout(filledCount: number): CardImageLayout {
  if (filledCount <= 1) return "single";
  if (filledCount === 2) return "dual";
  return "collage";
}

/** Merge draft builder images into admin preview model — local blob/profile URLs only. */
export function applyCardBuilderImagesToPreview(
  model: CardPreviewModel,
  draftSlots: CardBuilderDraftImageSlot[],
): CardPreviewModel {
  const filledCount = countFilledSlots(draftSlots);
  if (filledCount === 0) {
    return model;
  }

  const previewSlots = buildPreviewSlotsFromDraft(draftSlots);
  const imageLayout = resolveBuilderImageLayout(filledCount);
  const filled = previewSlots.filter((slot) => Boolean(slot.previewUrl));

  if (imageLayout === "single") {
    return {
      ...model,
      imageLayout: "single",
      imageSlots: [filled[0]!],
    };
  }

  if (imageLayout === "dual") {
    return {
      ...model,
      imageLayout: "dual",
      imageSlots: filled.slice(0, 2),
    };
  }

  return {
    ...model,
    imageLayout: "collage",
    imageSlots: previewSlots.slice(0, CARD_BUILDER_IMAGE_SLOT_COUNT),
  };
}

/** Owner photo URL from preview slots — for avatar band, not persisted. */
export function resolveOwnerPhotoFromPreviewSlots(slots: CardImageSlot[]): string | undefined {
  const ownerSlot = slots.find((slot) => slot.role === "owner" && slot.previewUrl?.trim());
  return ownerSlot?.previewUrl?.trim() || undefined;
}
