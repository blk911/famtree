import type { CardPreviewModel, CardTemplateInput } from "@/lib/vmb/cards/card-preview-model";
import { buildPreviewFromTemplate } from "@/lib/vmb/card-templates/apply-card-template";
import { getTemplateForType } from "@/lib/vmb/card-templates/card-template-store";

export async function buildCardPreviewForSalon(
  salonId: string,
  input: CardTemplateInput,
): Promise<CardPreviewModel> {
  const template = input.template ?? (await getTemplateForType(salonId, input.cardType));
  return buildPreviewFromTemplate(template, input, input.techName);
}
