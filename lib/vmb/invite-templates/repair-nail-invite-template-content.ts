import { DEFAULT_NAIL_INVITE_TEMPLATES } from "./default-nail-invite-templates";
import {
  loadNailInviteTemplateDiagnostics,
  printNailInviteTemplateDiagnostics,
  summarizeNailInviteTemplates,
  validateNailInviteTemplateDiagnostics,
} from "./invite-template-diagnostics";
import { listInviteTemplates, upsertInviteTemplate } from "./invite-template-store";
import { resolveVmbStorageBackend } from "@/lib/vmb/db";
import type { VmbInviteTemplate } from "./invite-template-types";

export type RepairNailInviteTemplateContentResult = {
  backend: "postgres" | "json";
  repaired: number;
  errors: string[];
  before: ReturnType<typeof summarizeNailInviteTemplates>;
  after: ReturnType<typeof summarizeNailInviteTemplates>;
};

function buildRepairPayload(template: VmbInviteTemplate): VmbInviteTemplate {
  const now = new Date().toISOString();
  return {
    ...template,
    subject: template.subject,
    eyebrow: template.eyebrow,
    headline: template.headline,
    body: template.body,
    ctaLabel: template.ctaLabel,
    intent: template.intent,
    defaultOfferCategory: template.defaultOfferCategory,
    allowedOfferCategories: [...template.allowedOfferCategories],
    active: template.active,
    sortOrder: template.sortOrder,
    updatedAt: now,
  };
}

/**
 * Overwrites all 10 Nail invite templates via the same store used by GET /api/vmb/invite-templates.
 */
export async function repairNailInviteTemplateContent(): Promise<RepairNailInviteTemplateContentResult> {
  const backend = await resolveVmbStorageBackend();
  const beforeTemplates = await listInviteTemplates("nails", { includeInactive: true });
  const before = summarizeNailInviteTemplates(beforeTemplates, backend);

  const errors: string[] = [];
  let repaired = 0;

  for (const template of DEFAULT_NAIL_INVITE_TEMPLATES) {
    const result = await upsertInviteTemplate(buildRepairPayload(template));
    if ("error" in result) {
      errors.push(`${template.id}: ${result.error}`);
      continue;
    }
    repaired += 1;
  }

  const afterTemplates = await listInviteTemplates("nails", { includeInactive: true });
  const after = summarizeNailInviteTemplates(afterTemplates, backend);

  return { backend, repaired, errors, before, after };
}

export async function assertRepairedNailInviteStore(): Promise<void> {
  const summary = await loadNailInviteTemplateDiagnostics();
  const validationErrors = validateNailInviteTemplateDiagnostics(summary);
  if (validationErrors.length) {
    throw new Error(validationErrors.join("; "));
  }
}

export function printRepairSummary(result: RepairNailInviteTemplateContentResult): void {
  console.log(`active storage backend: ${result.backend}`);
  console.log(`repaired: ${result.repaired}`);
  console.log("");
  console.log("before repair:");
  console.log(
    `  count=${result.before.count} uniqueBodies=${result.before.uniqueBodies} uniqueCtas=${result.before.uniqueCtas}`,
  );
  console.log("after repair:");
  console.log(
    `  count=${result.after.count} uniqueBodies=${result.after.uniqueBodies} uniqueCtas=${result.after.uniqueCtas}`,
  );
  console.log("");
  printNailInviteTemplateDiagnostics(result.after);
}
