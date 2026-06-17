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
  CARD_TYPE_TO_INVITE_TEMPLATE_ID,
  getInviteTemplateIdForCardType,
} from "../lib/vmb/invite-templates/card-type-invite-template-map";
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

  const previewBodies = new Set<string>();
  const previewCtas = new Set<string>();
  for (const template of DEFAULT_NAIL_INVITE_TEMPLATES) {
    const payload = buildInviteTemplateRenderPayload(template, INVITE_TEMPLATE_PREVIEW_CONTEXT);
    previewBodies.add(payload.body.trim());
    previewCtas.add(payload.ctaLabel.trim());
  }
  assert(previewBodies.size === 10, "each invite type produces unique rendered preview body");
  assert(previewCtas.size === 10, "each invite type produces unique rendered preview CTA");

  const referral = DEFAULT_NAIL_INVITE_TEMPLATES.find((row) => row.id === "nails-referral-invite")!;
  const referralPreview = buildInviteTemplateRenderPayload(referral, INVITE_TEMPLATE_PREVIEW_CONTEXT);
  assert(
    referralPreview.body.includes("friend"),
    "referral invite preview body is referral-specific",
  );

  const birthday = DEFAULT_NAIL_INVITE_TEMPLATES.find((row) => row.id === "nails-birthday-celebration")!;
  const birthdayPreview = buildInviteTemplateRenderPayload(birthday, INVITE_TEMPLATE_PREVIEW_CONTEXT);
  assert(
    birthdayPreview.body.includes("Birthday"),
    "birthday invite preview body is birthday-specific",
  );

  const openChair = DEFAULT_NAIL_INVITE_TEMPLATES.find((row) => row.id === "nails-open-chair")!;
  const openChairPreview = buildInviteTemplateRenderPayload(openChair, INVITE_TEMPLATE_PREVIEW_CONTEXT);
  assert(
    openChairPreview.body.toLowerCase().includes("opening") ||
      openChairPreview.body.toLowerCase().includes("open"),
    "open chair invite preview body is open-chair-specific",
  );

  const pcn = DEFAULT_NAIL_INVITE_TEMPLATES.find((row) => row.id === "nails-private-client-network")!;
  const refresh = DEFAULT_NAIL_INVITE_TEMPLATES.find((row) => row.id === "nails-refresh-reminder")!;
  const refreshPreview = buildInviteTemplateRenderPayload(refresh, INVITE_TEMPLATE_PREVIEW_CONTEXT);
  assert(
    !refreshPreview.body.includes("Private Client Network"),
    "refresh preview does not use PCN fallback copy",
  );
  assert(
    getInviteTemplateIdForCardType("pcn_invite") === pcn.id,
    "pcn card type maps to nails-private-client-network",
  );
  assert(
    Object.keys(CARD_TYPE_TO_INVITE_TEMPLATE_ID).length === 8,
    "eight legacy card types map to nail invite templates",
  );

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
