import type { CardImageLayout } from "@/lib/vmb/cards/card-types";
import type { CardImageSlot, CardPreviewModel } from "@/lib/vmb/cards/card-preview-model";

export type CardBuilderDraftImageSlot = {
  previewUrl?: string;
  fileName?: string;
};

export const CARD_BUILDER_IMAGE_SLOT_COUNT = 3;

export function createEmptyCardBuilderImageSlots(): CardBuilderDraftImageSlot[] {
  return [{}, {}, {}];
}

function buildSlotsFromDraft(slots: CardBuilderDraftImageSlot[]): CardImageSlot[] {
  return slots
    .map((slot, index) => ({
      slot,
      index,
    }))
    .filter(({ slot }) => Boolean(slot.previewUrl))
    .map(({ slot, index }) => ({
      id: `builder-slot-${index + 1}`,
      label: `Slot ${index + 1}`,
      previewUrl: slot.previewUrl,
    }));
}

/** Auto layout from filled builder slots — admin preview only. */
export function applyCardBuilderImagesToPreview(
  model: CardPreviewModel,
  draftSlots: CardBuilderDraftImageSlot[],
): CardPreviewModel {
  const filledSlots = buildSlotsFromDraft(draftSlots);
  const filledCount = filledSlots.length;

  if (filledCount === 0) {
    return model;
  }

  let imageLayout: CardImageLayout = "single";
  if (filledCount === 2) {
    imageLayout = "dual";
  } else if (filledCount >= 3) {
    imageLayout = "collage";
  }

  return {
    ...model,
    imageLayout,
    imageSlots:
      filledCount >= 3
        ? filledSlots.slice(0, 3)
        : filledSlots,
  };
}
