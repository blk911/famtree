/**
 * npm run test:vmb:invite-templates
 */
import fs from "node:fs";
import path from "node:path";
import { resolveAdminNailInviteCardContent } from "../lib/vmb/invite-templates/admin-nail-invite-card-content";
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
import { repairNailInviteTemplateContent } from "../lib/vmb/invite-templates/repair-nail-invite-template-content";
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

const TOKEN_CONTEXT = {
  ...INVITE_TEMPLATE_PREVIEW_CONTEXT,
  ...PREVIEW_CONTEXT.recipientPreview,
  ...PREVIEW_CONTEXT.providerPreview,
};

const EXPECTED_CTAS: Record<string, string> = {
  "nails-private-client-network": "Join My Private Client Network",
  "nails-birthday-celebration": "View My Birthday Offer",
  "nails-referral-invite": "Invite Someone You Care About",
  "nails-open-chair": "Claim This Opening",
  "nails-refresh-reminder": "Book My Refresh",
  "nails-we-miss-you": "Come Back In",
  "nails-vip-thank-you": "View My Thank-You Offer",
  "nails-favorite-providers": "See My Trusted Favorites",
  "nails-first-visit-thank-you": "Plan My Next Visit",
  "nails-new-client-welcome": "Choose My First Offer",
};

function expectedRenderedBody(template: (typeof DEFAULT_NAIL_INVITE_TEMPLATES)[number]): string {
  return applyInviteTemplateTokens(template.body, TOKEN_CONTEXT);
}

function expectedRenderedCta(template: (typeof DEFAULT_NAIL_INVITE_TEMPLATES)[number]): string {
  return applyInviteTemplateTokens(template.ctaLabel, TOKEN_CONTEXT);
}

async function run(): Promise<void> {
  assert(DEFAULT_NAIL_INVITE_TEMPLATES.length === 10, "all 10 Nails invite templates exist");

  const repairResult = await repairNailInviteTemplateContent();
  assert(repairResult.repaired === 10, "repair script seeds exactly 10 Nail templates");
  assert(repairResult.errors.length === 0, "repair script completes without errors");
  assert(repairResult.after.uniqueBodies === 10, "repair leaves 10 unique stored bodies");
  assert(repairResult.after.uniqueCtas >= 8, "repair leaves at least 8 unique stored CTAs");

  const listed = await listInviteTemplates("nails", { includeInactive: true });
  assert(listed.length === 10, "GET store returns 10 nails templates");

  const storedUniqueBodies = new Set(listed.map((row) => row.body.trim())).size;
  assert(storedUniqueBodies === 10, "store-level list has 10 unique bodies");

  const storedById = new Map(listed.map((row) => [row.id, row]));
  assert(
    storedById.get("nails-birthday-celebration")!.body.startsWith("Happy Birthday"),
    "stored birthday body starts with Happy Birthday",
  );
  assert(
    storedById.get("nails-referral-invite")!.body.startsWith("Hi {clientName}, some of my best clients"),
    "stored referral body starts correctly",
  );
  assert(
    storedById.get("nails-open-chair")!.body.startsWith("Hi {clientName}, I had an appointment open up"),
    "stored open chair body starts correctly",
  );
  assert(
    storedById.get("nails-private-client-network")!.body.startsWith("Hi {clientName}, I'm inviting a small group"),
    "stored PCN body starts correctly",
  );
  assert(
    storedById.get("nails-refresh-reminder")!.body.startsWith("Hi {clientName}, it may be time"),
    "stored refresh body starts correctly",
  );

  const bodies = new Set(DEFAULT_NAIL_INVITE_TEMPLATES.map((template) => template.body.trim()));
  assert(bodies.size === 10, "each invite type has unique body content");

  const pcn = DEFAULT_NAIL_INVITE_TEMPLATES.find((row) => row.id === "nails-private-client-network")!;
  const referral = DEFAULT_NAIL_INVITE_TEMPLATES.find((row) => row.id === "nails-referral-invite")!;
  const birthday = DEFAULT_NAIL_INVITE_TEMPLATES.find((row) => row.id === "nails-birthday-celebration")!;
  const openChair = DEFAULT_NAIL_INVITE_TEMPLATES.find((row) => row.id === "nails-open-chair")!;
  const refresh = DEFAULT_NAIL_INVITE_TEMPLATES.find((row) => row.id === "nails-refresh-reminder")!;

  assert(referral.body !== pcn.body, "referral body does not equal PCN body");
  assert(birthday.body !== pcn.body, "birthday body does not equal PCN body");
  assert(openChair.body !== pcn.body, "open chair body does not equal PCN body");
  assert(refresh.body !== pcn.body, "refresh body does not equal PCN body");

  for (const template of DEFAULT_NAIL_INVITE_TEMPLATES) {
    assert(template.categoryId === "nails", `${template.id} has categoryId nails`);
    assert(validateInviteTemplateInput(template) === null, `${template.id} passes validation`);
    assert(
      template.allowedOfferCategories.includes(template.defaultOfferCategory),
      `${template.id} defaultOfferCategory is allowed`,
    );
    assert(
      template.ctaLabel === EXPECTED_CTAS[template.id],
      `${template.id} has exact expected CTA`,
    );

    const adminCard = resolveAdminNailInviteCardContent(template, TOKEN_CONTEXT);
    assert(adminCard.body === expectedRenderedBody(template), `${template.id} admin card renders exact template body`);
    assert(
      adminCard.ctaLabel === expectedRenderedCta(template),
      `${template.id} admin card renders exact template ctaLabel`,
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

  const referralWithoutOffer = resolveAdminNailInviteCardContent(referral, TOKEN_CONTEXT);
  const referralWithOfferPayload = buildInviteTemplateRenderPayload({
    inviteTemplate: referral,
    ...PREVIEW_CONTEXT,
    salonOffer: resolvedSalonOfferToRenderOffer(mockDisplay),
  });
  assert(referralWithOfferPayload.offer?.name === "Birthday Babe", "preview renders with selected offer");
  assert(
    referralWithOfferPayload.body === expectedRenderedBody(referral),
    "selecting a salon offer does not change invite body",
  );
  assert(
    referralWithOfferPayload.ctaLabel === expectedRenderedCta(referral),
    "selecting a salon offer does not change invite CTA",
  );
  assert(referralWithoutOffer.body.includes("friend"), "referral invite preview body is referral-specific");

  const birthdayPreview = resolveAdminNailInviteCardContent(birthday, TOKEN_CONTEXT);
  assert(birthdayPreview.body.startsWith("Happy Birthday Grace!"), "birthday body starts correctly");
  assert(birthdayPreview.ctaLabel === "View My Birthday Offer", "birthday CTA is exact");

  const openChairPreview = resolveAdminNailInviteCardContent(openChair, TOKEN_CONTEXT);
  assert(
    openChairPreview.body.startsWith("Hi Grace, I had an appointment open up"),
    "open chair body starts correctly",
  );
  assert(openChairPreview.ctaLabel === "Claim This Opening", "open chair CTA is exact");

  const pcnPreview = resolveAdminNailInviteCardContent(pcn, TOKEN_CONTEXT);
  assert(pcnPreview.ctaLabel === "Join My Private Client Network", "PCN CTA is exact");
  assert(
    pcnPreview.body.startsWith("Hi Grace, I'm inviting a small group"),
    "PCN body starts correctly",
  );

  const refreshPreview = resolveAdminNailInviteCardContent(refresh, TOKEN_CONTEXT);
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

  const emptyBodyCard = resolveAdminNailInviteCardContent({ ...referral, body: "   " }, TOKEN_CONTEXT);
  assert(
    emptyBodyCard.body === "Template body missing for nails-referral-invite",
    "empty body shows visible missing message",
  );

  const cardTemplates = await getTemplatesForSalon("invite-template-test-salon");
  assert(cardTemplates.length >= 8, "existing card template behavior still loads defaults");

  assert(
    getInviteTemplateIdForCardType("pcn_invite") === pcn.id,
    "pcn card type maps to nails-private-client-network",
  );
  assert(Object.keys(CARD_TYPE_TO_INVITE_TEMPLATE_ID).length === 8, "eight legacy card types mapped");

  const adminClientSource = fs.readFileSync(
    path.join(process.cwd(), "components/vmb/admin/CardTemplateAdminClient.tsx"),
    "utf8",
  );
  assert(!adminClientSource.includes("CardPreview"), "admin templates page does not import CardPreview");
  assert(
    !adminClientSource.includes("PersonalInvitePreview"),
    "admin templates page does not import PersonalInvitePreview",
  );
  assert(
    adminClientSource.includes("AdminNailInviteCard"),
    "admin templates page renders AdminNailInviteCard directly",
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
