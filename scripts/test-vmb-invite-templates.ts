/**
 * npm run test:vmb:invite-templates
 */
import { DEFAULT_NAIL_INVITE_TEMPLATES } from "../lib/vmb/invite-templates/default-nail-invite-templates";
import {
  buildInviteTemplateRenderPayload,
  resolvedSalonOfferToRenderOffer,
} from "../lib/vmb/invite-templates/invite-template-render";
import { INVITE_TEMPLATE_PREVIEW_CONTEXT } from "../lib/vmb/invite-templates/invite-template-tokens";
import {
  listInviteTemplates,
  upsertInviteTemplate,
  validateInviteTemplateInput,
} from "../lib/vmb/invite-templates/invite-template-store";
import { getTemplatesForSalon } from "../lib/vmb/card-templates/card-template-store";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

async function run(): Promise<void> {
  assert(DEFAULT_NAIL_INVITE_TEMPLATES.length === 10, "all 10 Nails invite templates exist");

  const bodies = new Set(DEFAULT_NAIL_INVITE_TEMPLATES.map((template) => template.body.trim()));
  assert(bodies.size === 10, "each invite type has unique body content");

  for (const template of DEFAULT_NAIL_INVITE_TEMPLATES) {
    assert(template.categoryId === "nails", `${template.id} has categoryId nails`);
    assert(
      validateInviteTemplateInput(template) === null,
      `${template.id} passes validation`,
    );
    assert(
      template.allowedOfferCategories.includes(template.defaultOfferCategory),
      `${template.id} defaultOfferCategory is allowed`,
    );
  }

  const withoutOffer = buildInviteTemplateRenderPayload(
    DEFAULT_NAIL_INVITE_TEMPLATES[0]!,
    INVITE_TEMPLATE_PREVIEW_CONTEXT,
  );
  assert(Boolean(withoutOffer.headline), "preview renders without selected offer");
  assert(!withoutOffer.offer, "preview without offer has no offer block");

  const mockDisplay = {
    id: "offer-test",
    name: "Birthday Babe",
    description: "Chrome and crystals birthday set.",
    priceCents: 11500,
    calculatedPriceCents: 10500,
    serviceName: "Gel-X Extensions",
    includedLines: ["Gel-X Extensions", "Chrome Finish"],
    addonLabels: ["Chrome Finish", "Crystal Accents"],
  };

  const withOffer = buildInviteTemplateRenderPayload(
    DEFAULT_NAIL_INVITE_TEMPLATES[1]!,
    INVITE_TEMPLATE_PREVIEW_CONTEXT,
    resolvedSalonOfferToRenderOffer(mockDisplay),
  );
  assert(withOffer.offer?.name === "Birthday Babe", "preview renders with selected offer");
  assert(withOffer.offer?.addonLabels.length === 2, "preview includes add-on labels");

  const listed = await listInviteTemplates("nails", { includeInactive: true });
  assert(listed.length === 10, "listInviteTemplates returns 10 nails templates");

  const cardTemplates = await getTemplatesForSalon("invite-template-test-salon");
  assert(cardTemplates.length >= 8, "existing card template behavior still loads defaults");

  if (process.env.DATABASE_URL?.trim()) {
    const sample = { ...DEFAULT_NAIL_INVITE_TEMPLATES[0]! };
    sample.headline = "Test headline for persistence";
    const saved = await upsertInviteTemplate(sample);
    assert(!("error" in saved), "invite template upsert succeeds with DATABASE_URL");
    const reloaded = await listInviteTemplates("nails", { includeInactive: true });
    const updated = reloaded.find((row) => row.id === sample.id);
    assert(updated?.headline === "Test headline for persistence", "invite template override persists");
  }

  console.log("OK: VMB invite templates tests passed");
}

void run();
