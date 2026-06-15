import type { CardPreviewModel, CardTemplateInput } from "@/lib/vmb/cards/card-preview-model";
import { buildPreviewFromTemplate } from "@/lib/vmb/card-templates/apply-card-template";
import type { VmbCardTemplate } from "@/lib/vmb/card-templates/card-template-types";
import { getDefaultTemplate } from "@/lib/vmb/card-templates/default-card-templates";

/** Client-safe card preview builder — uses seeded defaults unless a template is passed in. */
export function buildCardPreview(
  input: CardTemplateInput,
  templateOverride?: VmbCardTemplate,
): CardPreviewModel {
  const template =
    templateOverride ?? input.template ?? getDefaultTemplate(input.cardType);
  return buildPreviewFromTemplate(template, input, input.techName);
}

export { buildPreviewFromTemplate } from "@/lib/vmb/card-templates/apply-card-template";
