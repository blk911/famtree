import { DEFAULT_NAIL_INVITE_TEMPLATES } from "./default-nail-invite-templates";
import { upsertInviteTemplate } from "./invite-template-store";

export type RepairNailInviteTemplateContentResult = {
  repaired: number;
  errors: string[];
};

/**
 * Overwrites all 10 Nail invite templates in the invite template store with known-good catalog copy.
 */
export async function repairNailInviteTemplateContent(): Promise<RepairNailInviteTemplateContentResult> {
  const errors: string[] = [];
  let repaired = 0;

  for (const template of DEFAULT_NAIL_INVITE_TEMPLATES) {
    const result = await upsertInviteTemplate({ ...template });
    if ("error" in result) {
      errors.push(`${template.id}: ${result.error}`);
      continue;
    }
    repaired += 1;
  }

  return { repaired, errors };
}
