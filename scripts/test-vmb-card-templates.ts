/**

 * npm run test:vmb:card-templates

 */

import { ensureVmbStorageTables, resetVmbStorageBackendCache, resolveVmbStorageBackend } from "../lib/vmb/db";

import { buildPreviewFromTemplate } from "../lib/vmb/card-templates/apply-card-template";

import { applyTemplateTokens, buildTemplateTokenContext } from "../lib/vmb/card-templates/template-tokens";

import { getDefaultCtaForTemplateType } from "../lib/vmb/card-templates/template-cta-labels";

import {

  clearSalonTemplateOverrides,

  getAllDefaultTemplates,

  getDefaultTemplate,

  getTemplateForType,

  getTemplatesForSalon,

  resetTemplateToDefault,

  upsertTemplateOverride,

} from "../lib/vmb/card-templates/card-template-store";

import { VMB_CARD_TYPES } from "../lib/vmb/cards/card-types";

import { buildCardPreview } from "../lib/vmb/cards/card-template-engine";

import { CARD_TEMPLATE_PREVIEW_CONTEXT } from "../lib/vmb/card-templates/default-card-templates";



function assert(condition: boolean, message: string): void {

  if (!condition) {

    console.error(`FAIL: ${message}`);

    process.exit(1);

  }

}



async function run(): Promise<void> {

  const defaults = getAllDefaultTemplates();

  assert(defaults.length === 8, `expected 8 default templates, got ${defaults.length}`);

  for (const type of VMB_CARD_TYPES) {

    assert(defaults.some((template) => template.type === type), `missing default template ${type}`);

    const preview = buildPreviewFromTemplate(

      getDefaultTemplate(type),

      {

        cardType: type,

        recipientName: CARD_TEMPLATE_PREVIEW_CONTEXT.clientName,

        salonName: CARD_TEMPLATE_PREVIEW_CONTEXT.salonName,

        techName: CARD_TEMPLATE_PREVIEW_CONTEXT.ownerName,

        serviceName: CARD_TEMPLATE_PREVIEW_CONTEXT.serviceName,

        lastVisit: CARD_TEMPLATE_PREVIEW_CONTEXT.lastVisit,

        visitCount: CARD_TEMPLATE_PREVIEW_CONTEXT.visitCount,

      },

      CARD_TEMPLATE_PREVIEW_CONTEXT.ownerName,

    );

    assert(preview.cta === getDefaultCtaForTemplateType(type), `${type} uses auto-generated CTA`);

  }



  const tokenContext = {

    clientName: "Grace",

    ownerName: "Jenny",

    salonName: "Blue Mountain Salon",

    serviceName: "Gel-X",

    lastVisit: "May 12",

    visitCount: 3,

    referralCount: 1,

    offer: "Early access",

    nextOpening: "Thursday at 2:00 PM",

  };

  const rendered = applyTemplateTokens(

    "Dear {clientName}, welcome to {salonName} for {serviceName}. Visits: {visitCount}.",

    tokenContext,

  );

  assert(rendered.includes("Grace"), "token clientName renders");

  assert(rendered.includes("Blue Mountain Salon"), "token salonName renders");

  assert(rendered.includes("Gel-X"), "token serviceName renders");

  assert(rendered.includes("3"), "token visitCount renders");



  const salonId = `card-template-test-${Date.now()}`;

  const pcnDefault = await getTemplateForType(salonId, "pcn_invite");

  assert(pcnDefault.isDefault === true, "getTemplateForType returns default when no override");

  assert(!pcnDefault.titleTemplate, "PCN default has no title template");

  assert(Boolean(pcnDefault.relationshipBenefitTemplate), "PCN default has relationship benefit template");



  const birthdayDefault = getDefaultTemplate("birthday_card");

  assert(Boolean(birthdayDefault.titleTemplate), "non-PCN default has title template");

  assert(Boolean(birthdayDefault.relationshipBenefitTemplate), "non-PCN default has relationship benefit template");



  const birthdayPreview = buildCardPreview({

    cardType: "birthday_card",

    recipientName: "Grace",

    salonName: "Blue Mountain Salon",

    techName: "Jenny",

  });

  assert(birthdayPreview.title.length > 0, "non-PCN card preview keeps title");

  assert(birthdayPreview.subtitle.length > 0, "non-PCN card preview keeps subtitle");

  assert(Boolean(birthdayPreview.relationshipBenefit), "non-PCN card preview renders relationship benefit");
  assert(
    Boolean(birthdayPreview.templateOfferLine) || Boolean(birthdayPreview.offer),
    "non-PCN preview keeps offer note and/or offer card data",
  );

  const pcnPreview = buildCardPreview({
    cardType: "pcn_invite",

    recipientName: "Grace",

    salonName: "Blue Mountain Salon",

    techName: "Jenny",

    serviceName: "Gel-X",

    visitCount: 3,

    lastVisit: "May 12",

  });

  assert(pcnPreview.title === "", "PCN card preview has no title");

  assert(pcnPreview.subtitle === "", "PCN card preview has no subtitle");

  assert(Boolean(pcnPreview.inviteCopy?.personalConnection), "PCN card uses personal connection");

  assert(Boolean(pcnPreview.inviteCopy?.inviteMessage), "PCN card uses relationship benefit");

  assert(pcnPreview.cta === "Join Private Client Network", "PCN card uses auto-generated CTA");

  assert(pcnPreview.inviteCopy?.secondaryCta === "", "PCN card has no secondary CTA");



  const legacyPcn = {

    ...getDefaultTemplate("pcn_invite"),

    relationshipBenefitTemplate: undefined,

    messageTemplate:

      "I wanted to personally invite you into my Private Client Network at {salonName}. This is where I share first access to openings, client-only offers, and little surprises before they go anywhere else.",

  };

  const legacyPreview = buildPreviewFromTemplate(

    legacyPcn,

    {

      cardType: "pcn_invite",

      recipientName: "Grace",

      salonName: "Blue Mountain Salon",

      techName: "Jenny",

      serviceName: "Gel-X",

      visitCount: 3,

      lastVisit: "May 12",

    },

    "Jenny",

  );

  assert(
    Boolean(legacyPreview.inviteCopy?.inviteMessage.includes("Private Client Network")),
    "legacy PCN without relationshipBenefitTemplate still renders invite message",
  );



  const customPcn = {

    ...pcnDefault,

    messageTemplate: "Custom personal connection for {clientName}.",

    relationshipBenefitTemplate: "Custom PCN message for {clientName} at {salonName}.",

    primaryCta: "Custom Join CTA",

    secondaryCta: "Custom Secondary CTA",

  };

  const saved = await upsertTemplateOverride(salonId, customPcn);

  if ("error" in saved) {

    if (process.env.VERCEL && !process.env.DATABASE_URL) {

      console.log("SKIP: override persistence on Vercel without DATABASE_URL");

    } else if (!process.env.DATABASE_URL?.trim()) {

      const jsonSaved = await upsertTemplateOverride(salonId, customPcn);

      assert(!("error" in jsonSaved), `json override should persist in dev: ${"error" in jsonSaved ? jsonSaved.error : ""}`);

    } else {

      console.error("override save failed:", saved.error);

      process.exit(1);

    }

  } else {

    const loaded = await getTemplateForType(salonId, "pcn_invite");

    assert(loaded.messageTemplate.includes("Custom personal connection"), "override persists personal connection");

    assert(Boolean(loaded.relationshipBenefitTemplate?.includes("Custom PCN message")), "override persists relationship benefit");



    const enginePreview = buildCardPreview(

      {

        cardType: "pcn_invite",

        recipientName: "Grace",

        salonName: "Blue Mountain Salon",

        techName: "Jenny",

        serviceName: "Gel-X",

        visitCount: 3,

      },

      loaded,

    );

    assert(enginePreview.body.includes("Custom personal connection"), "card engine uses personal connection");

    assert(enginePreview.body.includes("Custom PCN message"), "card engine uses relationship benefit");

    assert(enginePreview.cta === "Join Private Client Network", "auto CTA overrides stored primaryCta");

    assert(enginePreview.inviteCopy?.secondaryCta === "", "secondary CTA ignored for PCN");



    const reset = await resetTemplateToDefault(salonId, "pcn_invite");

    assert(!("error" in reset), "reset succeeds");

    const afterReset = await getTemplateForType(salonId, "pcn_invite");

    assert(afterReset.isDefault === true, "reset returns default template");

    assert(afterReset.messageTemplate === pcnDefault.messageTemplate, "reset restores default personal connection");

  }



  const engineFromDefault = buildPreviewFromTemplate(

    getDefaultTemplate("service_card"),

    {

      cardType: "service_card",

      recipientName: CARD_TEMPLATE_PREVIEW_CONTEXT.clientName,

      salonName: CARD_TEMPLATE_PREVIEW_CONTEXT.salonName,

      serviceName: CARD_TEMPLATE_PREVIEW_CONTEXT.serviceName,

      techName: CARD_TEMPLATE_PREVIEW_CONTEXT.ownerName,

    },

    CARD_TEMPLATE_PREVIEW_CONTEXT.ownerName,

  );

  assert(engineFromDefault.title.includes("Something New"), "service card title from template");



  const tokenFromInput = buildTemplateTokenContext(

    {

      cardType: "refresh_card",

      recipientName: "Grace Smith",

      salonName: "Blue Mountain Salon",

      visitCount: 3,

      lastVisit: "May 12",

    },

    "Jenny",

  );

  assert(tokenFromInput.clientName === "Grace", "buildTemplateTokenContext first name");



  if (process.env.DATABASE_URL?.trim()) {

    await ensureVmbStorageTables();

    const backend = await resolveVmbStorageBackend();

    assert(backend === "postgres" || !process.env.VERCEL, "postgres backend when DATABASE_URL set");

    const allForSalon = await getTemplatesForSalon(salonId);

    assert(allForSalon.length === 8, "getTemplatesForSalon returns all 8 merged templates");

  }



  await clearSalonTemplateOverrides(salonId);

  resetVmbStorageBackendCache();



  console.log("OK: VMB card template tests passed");

}



void run();


