/**
 * npm run test:vmb:invite-templates
 */
import { DEFAULT_NAIL_INVITE_TEMPLATES } from "../lib/vmb/invite-templates/default-nail-invite-templates";
import {
  inviteTemplateHasLegacyBleed,
  sanitizeInviteTemplateAgainstLegacyBleed,
} from "../lib/vmb/invite-templates/invite-template-copy-guard";
import {
  buildInviteTemplateRenderPayload,
  resolvedSalonOfferToRenderOffer,
} from "../lib/vmb/invite-templates/invite-template-render";
import {
  INVITE_TEMPLATE_PREVIEW_CONTEXT,
  applyInviteTemplateTokens,
} from "../lib/vmb/invite-templates/invite-template-tokens";
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

const PREVIEW_CONTEXT = {
  recipientPreview: {
    clientName: INVITE_TEMPLATE_PREVIEW_CONTEXT.clientName,
    salonName: INVITE_TEMPLATE_PREVIEW_CONTEXT.salonName,
  },
  providerPreview: {
    providerName: INVITE_TEMPLATE_PREVIEW_CONTEXT.providerName,
  },
};

function expectedRenderedBody(template: (typeof DEFAULT_NAIL_INVITE_TEMPLATES)[number]): string {
  return applyInviteTemplateTokens(template.body, {
    ...INVITE_TEMPLATE_PREVIEW_CONTEXT,
    ...PREVIEW_CONTEXT.recipientPreview,
    ...PREVIEW_CONTEXT.providerPreview,
  });
}

function expectedRenderedCta(template: (typeof DEFAULT_NAIL_INVITE_TEMPLATES)[number]): string {
  return applyInviteTemplateTokens(template.ctaLabel, {
    ...INVITE_TEMPLATE_PREVIEW_CONTEXT,
    ...PREVIEW_CONTEXT.recipientPreview,
    ...PREVIEW_CONTEXT.providerPreview,
  });
}

async function run(): Promise<void> {
  assert(DEFAULT_NAIL_INVITE_TEMPLATES.length === 10, "all 10 Nails invite templates exist");

  const bodies = new Set(DEFAULT_NAIL_INVITE_TEMPLATES.map((template) => template.body.trim()));
  assert(bodies.size === 10, "each invite type has unique body content");

  for (const template of DEFAULT_NAIL_INVITE_TEMPLATES) {
    assert(template.categoryId === "nails", `${template.id} has categoryId nails`);
    assert(validateInviteTemplateInput(template) === null, `${template.id} passes validation`);
    assert(
      template.allowedOfferCategories.includes(template.defaultOfferCategory),
      `${template.id} defaultOfferCategory is allowed`,
    );

    const payload = buildInviteTemplateRenderPayload({
      inviteTemplate: template,
      ...PREVIEW_CONTEXT,
    });
    assert(payload.body === expectedRenderedBody(template), `${template.id} renders exact template body`);
    assert(
      payload.ctaLabel === expectedRenderedCta(template),
      `${template.id} renders exact template ctaLabel`,
    );
    assert(payload.templateId === template.id, `${template.id} payload carries template id`);

    if (template.id !== "nails-private-client-network") {
      assert(
        !payload.body.toLowerCase().includes("private client network"),
        `${template.id} rendered body has no PCN bleed`,
      );
    }
  }

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

  const referral = DEFAULT_NAIL_INVITE_TEMPLATES.find((row) => row.id === "nails-referral-invite")!;
  const referralWithoutOffer = buildInviteTemplateRenderPayload({
    inviteTemplate: referral,
    ...PREVIEW_CONTEXT,
  });
  const referralWithOffer = buildInviteTemplateRenderPayload({
    inviteTemplate: referral,
    ...PREVIEW_CONTEXT,
    salonOffer: resolvedSalonOfferToRenderOffer(mockDisplay),
  });
  assert(referralWithOffer.offer?.name === "Birthday Babe", "preview renders with selected offer");
  assert(
    referralWithOffer.body === referralWithoutOffer.body,
    "selecting a salon offer does not change invite body",
  );
  assert(
    referralWithOffer.ctaLabel === referralWithoutOffer.ctaLabel,
    "selecting a salon offer does not change invite CTA",
  );
  assert(referralWithoutOffer.body.includes("friend"), "referral invite preview body is referral-specific");

  const birthday = DEFAULT_NAIL_INVITE_TEMPLATES.find((row) => row.id === "nails-birthday-celebration")!;
  const birthdayPreview = buildInviteTemplateRenderPayload({
    inviteTemplate: birthday,
    ...PREVIEW_CONTEXT,
  });
  assert(birthdayPreview.body.startsWith("Happy Birthday Grace!"), "birthday body starts correctly");
  assert(birthdayPreview.ctaLabel === "View My Birthday Offer", "birthday CTA is exact");

  const openChair = DEFAULT_NAIL_INVITE_TEMPLATES.find((row) => row.id === "nails-open-chair")!;
  const openChairPreview = buildInviteTemplateRenderPayload({
    inviteTemplate: openChair,
    ...PREVIEW_CONTEXT,
  });
  assert(openChairPreview.body.startsWith("Hi Grace, I had an appointment open up"), "open chair body starts correctly");
  assert(openChairPreview.ctaLabel === "Claim This Opening", "open chair CTA is exact");

  const pcn = DEFAULT_NAIL_INVITE_TEMPLATES.find((row) => row.id === "nails-private-client-network")!;
  const pcnPreview = buildInviteTemplateRenderPayload({
    inviteTemplate: pcn,
    ...PREVIEW_CONTEXT,
  });
  assert(pcnPreview.ctaLabel === "Join My Private Client Network", "PCN CTA is exact");
  assert(
    pcnPreview.body.startsWith("Hi Grace, I'm inviting a small group"),
    "PCN body starts correctly",
  );

  const refresh = DEFAULT_NAIL_INVITE_TEMPLATES.find((row) => row.id === "nails-refresh-reminder")!;
  const refreshPreview = buildInviteTemplateRenderPayload({
    inviteTemplate: refresh,
    ...PREVIEW_CONTEXT,
  });
  assert(refreshPreview.body.startsWith("Hi Grace, it may be time"), "refresh body starts correctly");
  assert(refreshPreview.ctaLabel === "Book My Refresh", "refresh CTA is exact");

  const corruptedReferral = {
    ...referral,
    body: pcn.body,
    ctaLabel: pcn.ctaLabel,
  };
  assert(inviteTemplateHasLegacyBleed(corruptedReferral), "detects legacy PCN bleed on referral template");
  const sanitized = sanitizeInviteTemplateAgainstLegacyBleed(corruptedReferral);
  assert(sanitized.body === referral.body, "sanitizer restores nail-catalog referral body");

  const emptyBodyPayload = buildInviteTemplateRenderPayload({
    inviteTemplate: { ...referral, body: "   " },
    ...PREVIEW_CONTEXT,
  });
  assert(emptyBodyPayload.body === "Template body missing.", "empty body shows visible missing message");

  const listed = await listInviteTemplates("nails", { includeInactive: true });
  assert(listed.length === 10, "listInviteTemplates returns 10 nails templates");

  const cardTemplates = await getTemplatesForSalon("invite-template-test-salon");
  assert(cardTemplates.length >= 8, "existing card template behavior still loads defaults");

  assert(
    getInviteTemplateIdForCardType("pcn_invite") === pcn.id,
    "pcn card type maps to nails-private-client-network",
  );
  assert(Object.keys(CARD_TYPE_TO_INVITE_TEMPLATE_ID).length === 8, "eight legacy card types mapped");

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
