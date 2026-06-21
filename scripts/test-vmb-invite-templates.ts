/**
 * npm run test:vmb:invite-templates
 */
import fs from "node:fs";
import path from "node:path";
import { resolveAdminNailInviteCardContent } from "../lib/vmb/invite-templates/admin-nail-invite-card-content";
import {
  getSelectedInviteDraft,
  inviteSelectionStateIsSynced,
  patchInviteDraftRecord,
  selectInviteTemplateId,
} from "../lib/vmb/invite-templates/admin-invite-template-selection";
import { DEFAULT_NAIL_INVITE_TEMPLATES } from "../lib/vmb/invite-templates/default-nail-invite-templates";
import {
  buildAdminDefaultSnapshotFromTemplate,
  resolveAdminDefaultInvitationPackageWithPricing,
  validateDefaultInvitationPackage,
} from "../lib/vmb/invite-templates/admin-default-invitation-package";
import { DEFAULT_NAIL_INVITATION_PACKAGES } from "../lib/vmb/invite-templates/default-nail-invitation-packages";
import { calculateInvitationPackagePricing } from "../lib/vmb/invites/invitation-package-pricing";
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
import {
  NAIL_OFFER_ADDON_CHOICES,
  NAIL_OFFER_SERVICE_CHOICES,
  resolveNailOfferAddonLabels,
  resolveNailOfferServiceLabels,
  toggleOfferIdSelection,
} from "../lib/vmb/admin/nail-offer-builder-selections";
import {
  mapInviteOfferCategoryToOfferCategory,
  offerToAdminNailInviteCardOffer,
  pickDefaultAttachedOfferId,
} from "../lib/vmb/admin/invite-offer-attachment";
import {
  buildNailTemplateDrafts,
  nailTemplateDraftToOffer,
  templateStorageId,
} from "../lib/vmb/admin/nail-template-library";
import {
  buildServiceTemplateParticipation,
  participatingTemplatesForService,
} from "../lib/vmb/invites/service-template-participation";
import {
  findPublishedCopyForTemplateId,
  normalizeSourceTemplateId,
} from "../lib/vmb/invites/published-copy-matching";
import {
  buildSuggestedInvitationsFromOpportunities,
  opportunityReasonHeadline,
} from "../lib/vmb/invites/suggested-invitation-workflow";

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

  for (const template of DEFAULT_NAIL_INVITE_TEMPLATES) {
    assert(!!template.defaultPackage, `${template.id} has admin defaultPackage`);
    assert(
      validateDefaultInvitationPackage(template.defaultPackage) === null,
      `${template.id} defaultPackage validates`,
    );
    assert(template.defaultPackage.serviceIds.length > 0, `${template.id} defaultPackage has services`);
    assert(
      template.defaultPackage.expirationLabel.trim().length > 0,
      `${template.id} defaultPackage has expiration`,
    );
    assert(
      JSON.stringify(template.defaultPackage) ===
        JSON.stringify(DEFAULT_NAIL_INVITATION_PACKAGES[template.inviteType]),
      `${template.id} defaultPackage matches canonical package map`,
    );
  }

  const unsavedBirthdayDraft = buildNailTemplateDrafts("pkg-test-salon", []).find(
    (row) => row.templateId === "nails-birthday-celebration",
  );
  assert(unsavedBirthdayDraft?.serviceIds.length === 1, "unsaved draft inherits admin default services");
  assert(
    (unsavedBirthdayDraft?.serviceOptionIds.length ?? 0) > 0,
    "unsaved draft inherits admin default add-ons",
  );

  const adminSnapshot = buildAdminDefaultSnapshotFromTemplate("nails-birthday-celebration", {
    salonName: "Glow Nails",
  });
  assert(!!adminSnapshot, "admin default snapshot builds for template");
  assert(
    adminSnapshot!.expirationLabel === DEFAULT_NAIL_INVITATION_PACKAGES.birthday_celebration.expirationLabel,
    "admin default snapshot carries expiration",
  );
  assert(adminSnapshot!.serviceIds.length > 0, "admin default snapshot carries service ids");
  assert(adminSnapshot!.totalValue === 110, "birthday admin snapshot freezes total value");
  assert(adminSnapshot!.savingsAmount === 15, "birthday admin snapshot freezes savings");
  assert(adminSnapshot!.offerPrice === 95, "birthday admin snapshot freezes offer price");
  assert(adminSnapshot!.valueLabel === "$110", "birthday admin snapshot carries value label");
  assert(adminSnapshot!.priceLabel === "$95", "birthday admin snapshot carries offer label");

  const gelManicurePricing = calculateInvitationPackagePricing({
    serviceIds: ["default-nails-gel-manicure"],
    serviceOptionIds: ["addon-chrome"],
  });
  assert(gelManicurePricing.serviceTotal === 55, "pricing sums service defaults");
  assert(gelManicurePricing.addOnTotal === 15, "pricing sums add-on defaults");
  assert(gelManicurePricing.totalValue === 70, "pricing totals service and add-ons");

  const birthdayResolved = resolveAdminDefaultInvitationPackageWithPricing("nails-birthday-celebration");
  assert((birthdayResolved?.pricing.savingsAmount ?? 0) > 0, "birthday default package has nonzero savings");
  assert(birthdayResolved?.pricing.totalValue === 110, "birthday package value is gel-x plus chrome");

  const pcnResolved = resolveAdminDefaultInvitationPackageWithPricing("nails-private-client-network");
  assert(pcnResolved?.pricing.savingsAmount === 0, "PCN default package has zero savings");
  assert(pcnResolved?.pricing.offerPrice === pcnResolved?.pricing.totalValue, "PCN offer equals full value");

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

  const templateIds = DEFAULT_NAIL_INVITE_TEMPLATES.map((row) => row.id);
  const draftMap = Object.fromEntries(
    DEFAULT_NAIL_INVITE_TEMPLATES.map((row) => [row.id, { ...row }]),
  ) as Record<string, (typeof DEFAULT_NAIL_INVITE_TEMPLATES)[number]>;

  assert(
    selectInviteTemplateId(templateIds, "nails-birthday-celebration", templateIds[0]!) ===
      "nails-birthday-celebration",
    "dropdown select changes selectedTemplateId",
  );
  assert(
    selectInviteTemplateId(templateIds, "nails-referral-invite", templateIds[0]!) ===
      "nails-referral-invite",
    "pill select changes same selectedTemplateId",
  );
  assert(
    selectInviteTemplateId(templateIds, "unknown-template", templateIds[0]!) === templateIds[0],
    "invalid template id preserves current selection",
  );

  const birthdayId = "nails-birthday-celebration";
  const birthdayDraft = getSelectedInviteDraft(draftMap, birthdayId)!;
  const birthdayCard = resolveAdminNailInviteCardContent(birthdayDraft, TOKEN_CONTEXT);
  assert(birthdayCard.ctaLabel === "View My Birthday Offer", "birthday draft preview uses birthday CTA");

  const referralId = "nails-referral-invite";
  const referralDraft = getSelectedInviteDraft(draftMap, referralId)!;
  const referralCard = resolveAdminNailInviteCardContent(referralDraft, TOKEN_CONTEXT);
  assert(
    referralCard.ctaLabel === "Invite Someone You Care About",
    "referral draft preview uses referral CTA",
  );
  assert(
    inviteSelectionStateIsSynced({
      selectedTemplateId: referralId,
      dropdownValue: referralId,
      pillSelectedId: referralId,
      draftTemplateId: referralDraft.id,
    }),
    "editor draft and preview payload use same template id",
  );

  assert(mapInviteOfferCategoryToOfferCategory("pcn") === "pcn", "pcn maps to offer category");
  assert(mapInviteOfferCategoryToOfferCategory("open_chair") === "open_slot", "open chair maps to open slot");
  const pcnTemplate = DEFAULT_NAIL_INVITE_TEMPLATES.find((row) => row.defaultOfferCategory === "pcn")!;
  const attachedId = pickDefaultAttachedOfferId(pcnTemplate, [
    {
      id: "default-birthday",
      name: "Birthday",
      category: "birthday",
      description: "",
      offerText: "Birthday treat",
      active: true,
      isDefault: true,
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "default-pcn",
      name: "PCN Early Access",
      category: "pcn",
      description: "",
      offerText: "PCN offer",
      active: true,
      isDefault: true,
      createdAt: "",
      updatedAt: "",
    },
  ]);
  assert(attachedId === "default-pcn", "attached offer defaults to template category match");
  const cardOffer = offerToAdminNailInviteCardOffer(
    {
      id: "default-pcn",
      name: "PCN Early Access",
      category: "pcn",
      description: "desc",
      offerText: "20% off",
      valueLabel: "$20 off",
      active: true,
      isDefault: true,
      createdAt: "",
      updatedAt: "",
    },
    ["Gel Manicure"],
    ["Chrome finish"],
  );
  assert(cardOffer?.name === "PCN Early Access", "offer card uses offer name");
  assert(cardOffer?.price === "$20 off", "offer card uses value label as price");
  assert(cardOffer?.serviceName === "Gel Manicure", "offer card includes linked service");

  const catalogPool = buildNailTemplateDrafts("demo-salon", [
    {
      id: "default-birthday",
      name: "Birthday Default",
      category: "birthday",
      description: "",
      offerText: "Default",
      active: true,
      isDefault: true,
      createdAt: "",
      updatedAt: "",
    },
    {
      id: templateStorageId("demo-salon", "nails-birthday-celebration"),
      templateId: "nails-birthday-celebration",
      name: "Birthday Saved",
      category: "birthday",
      description: "",
      offerText: "Saved body",
      headline: "Saved headline",
      body: "Saved body",
      ctaLabel: "Saved CTA",
      active: true,
      isDefault: false,
      createdAt: "",
      updatedAt: "",
    },
  ]);
  const savedBirthday = catalogPool.find((row) => row.templateId === "nails-birthday-celebration");
  assert(savedBirthday?.headline === "Saved headline", "template library merges saved headline");
  assert(savedBirthday?.saved === true, "template library marks saved templates");

  const offerPayload = nailTemplateDraftToOffer(
    {
      templateId: "nails-birthday-celebration",
      displayName: "Birthday Celebration",
      headline: "Headline",
      body: "Body copy",
      ctaLabel: "Book now",
      serviceIds: ["default-nails-gel-manicure"],
      serviceOptionIds: ["addon-chrome"],
      active: true,
      saved: false,
      offerCategory: "birthday",
    },
    "demo-salon",
  );
  assert(offerPayload.templateId === "nails-birthday-celebration", "template save persists templateId");
  assert(offerPayload.headline === "Headline", "template save persists headline");

  const patchedDrafts = patchInviteDraftRecord(draftMap, birthdayId, { body: "Edited birthday body" });
  assert(
    getSelectedInviteDraft(patchedDrafts, birthdayId)?.body === "Edited birthday body",
    "editor patch updates inviteDrafts[selectedTemplateId]",
  );
  assert(
    selectInviteTemplateId(templateIds, birthdayId, referralId) === birthdayId,
    "offer selection does not alter selectedTemplateId",
  );

  const builderSource = fs.readFileSync(
    path.join(process.cwd(), "components/vmb/admin/TemplateBuilderAdminClient.tsx"),
    "utf8",
  );
  assert(builderSource.includes("Nails Template Builder"), "builder client uses factory naming");
  assert(builderSource.includes("useNailTemplateInventory"), "builder loads template drafts via shared inventory hook");
  assert(builderSource.includes("Review Template"), "builder uses review template workflow");
  assert(builderSource.includes("AdminDefaultPackageSummary"), "builder shows admin default package");
  assert(!builderSource.includes("AdminTemplatePreviewCard"), "builder removes live draft preview card");
  assert(builderSource.includes("✓ Saved to Library"), "builder shows inline save confirmation");
  assert(builderSource.includes("View in Library"), "builder links to library after save");

  const salonInviteCardSource = fs.readFileSync(
    path.join(process.cwd(), "components/vmb/invites/SalonInviteCard.tsx"),
    "utf8",
  );
  assert(salonInviteCardSource.includes("expirationLabel"), "salon invite card renders expiration");
  assert(
    fs.readFileSync(path.join(process.cwd(), "components/vmb/salon/SuggestedInvitationCard.tsx"), "utf8").includes(
      "expirationLabel",
    ),
    "suggested invitation cards show expiration",
  );
  const suggestedCardSource = fs.readFileSync(
    path.join(process.cwd(), "components/vmb/salon/SuggestedInvitationCard.tsx"),
    "utf8",
  );
  assert(suggestedCardSource.includes("vmb-suggested-invite-card__body"), "suggested cards use compact layout");
  assert(suggestedCardSource.includes("Needs published template"), "suggested cards show unpublished badge");
  assert(suggestedCardSource.includes("SalonInvitationThumbnail"), "suggested cards show invite thumbnail");
  assert(
    suggestedCardSource.includes("Publish this invitation from Admin Library before approving."),
    "suggested cards explain disabled approve state",
  );
  assert(salonInviteCardSource.includes("adminReview"), "salon invite card supports admin review mode");
  assert(salonInviteCardSource.includes("Rewards included"), "salon invite card renders rewards");
  assert(salonInviteCardSource.includes("ownerPhotoUrl"), "salon invite card accepts owner photo");
  assert(salonInviteCardSource.includes("serviceImageUrl"), "salon invite card accepts service image");

  const reviewModalSource = fs.readFileSync(
    path.join(process.cwd(), "components/vmb/admin/AdminSalonInviteReviewModal.tsx"),
    "utf8",
  );
  assert(reviewModalSource.includes("Final Salon Invite Preview"), "review modal uses final salon invite title");
  assert(reviewModalSource.includes("snapshotToSalonInviteCardProps"), "review modal renders from snapshot payload");

  const snapshotModule = fs.readFileSync(
    path.join(process.cwd(), "lib/vmb/invites/invite-template-snapshot.ts"),
    "utf8",
  );
  assert(snapshotModule.includes("InviteTemplateSnapshot"), "invite template snapshot model exists");
  assert(snapshotModule.includes("ownerPhotoUrl"), "snapshot carries owner photo field");
  assert(snapshotModule.includes("buildInviteTemplateSnapshot"), "snapshot builder exists");

  const publishModule = fs.readFileSync(
    path.join(process.cwd(), "lib/vmb/invites/publish-template-to-salons.ts"),
    "utf8",
  );
  assert(publishModule.includes("createSalonLocalCopy"), "publish service creates salon local copy");

  const publishStore = fs.readFileSync(
    path.join(process.cwd(), "lib/vmb/invites/salon-invite-local-copy-store.ts"),
    "utf8",
  );
  assert(publishStore.includes("publishLibraryTemplateToSalon"), "publish store persists salon copies");
  assert(
    !publishStore.includes("SALON_INVITE_COPY_POSTGRES_REQUIRED"),
    "salon invite copy store does not hard-fail with postgres-only error",
  );
  assert(publishStore.includes("resolveVmbStorageBackend"), "salon invite copy store resolves storage backend");
  assert(
    fs.existsSync(path.join(process.cwd(), "lib/vmb/invites/salon-invite-local-copy-store-postgres.ts")),
    "salon invite copy postgres adapter exists",
  );
  assert(
    fs.existsSync(path.join(process.cwd(), "app/api/vmb/invite-library/publish/route.ts")),
    "invite library publish API route exists",
  );
  assert(
    fs.existsSync(path.join(process.cwd(), "app/api/vmb/salon-invites/route.ts")),
    "salon invites list API route exists",
  );

  const { buildDraftInviteSnapshot } = await import("../lib/vmb/admin/nail-template-library");
  const { createSalonLocalCopy } = await import("../lib/vmb/invites/publish-template-to-salons");

  const draftForSnapshot = {
    templateId: "nails-birthday-celebration",
    displayName: "Birthday Celebration",
    headline: "Happy Birthday",
    body: "Celebrate with us",
    ctaLabel: "Book now",
    serviceIds: ["default-nails-gel-manicure"],
    serviceOptionIds: ["addon-chrome"],
    active: true,
    saved: false,
    offerCategory: "birthday" as const,
  };
  const builtSnapshot = buildDraftInviteSnapshot(draftForSnapshot, {
    ownerName: "Alex",
    salonName: "Glow Nails",
    ownerPhotoUrl: "https://example.com/owner.jpg",
  });
  assert(builtSnapshot.headline === "Happy Birthday", "draft snapshot captures headline");
  assert(builtSnapshot.ownerPhotoUrl === "https://example.com/owner.jpg", "draft snapshot carries image fields");
  assert(builtSnapshot.serviceIds.length === 1, "draft snapshot captures service ids");

  const savedOffer = nailTemplateDraftToOffer(draftForSnapshot, "demo-salon", {
    ...builtSnapshot,
    status: "library",
    version: 1,
  });
  assert(savedOffer.inviteSnapshot?.version === 1, "save embeds invite snapshot on offer");

  const salonCopy = createSalonLocalCopy(savedOffer.inviteSnapshot!, "salon-123");
  assert(salonCopy.sourceTemplateId === "nails-birthday-celebration", "salon copy tracks source template");
  assert(salonCopy.publishedVersion === 1, "salon copy tracks published version");
  assert(salonCopy.snapshot.headline === "Happy Birthday", "salon copy snapshot is independent payload");

  const salonNavSource = fs.readFileSync(path.join(process.cwd(), "lib/vmb/salon-nav.ts"), "utf8");
  assert(salonNavSource.includes('label: "Invitations"'), "salon nav labels invitations");
  assert(!salonNavSource.includes('label: "Offers"'), "salon nav removes offers");
  assert(!salonNavSource.includes('label: "Queue"'), "salon nav removes queue");

  const invitesClientSource = fs.readFileSync(
    path.join(process.cwd(), "components/vmb/VmbInvitesClient.tsx"),
    "utf8",
  );
  assert(invitesClientSource.includes("Touch Points"), "invitations page title");
  assert(
    invitesClientSource.includes("on your salon page"),
    "invitations page subhead references salon page destination",
  );
  assert(invitesClientSource.includes("/api/vmb/salon-invites"), "invitations loads published copies");
  assert(invitesClientSource.includes("/api/taikos/opportunities"), "invitations loads opportunity intelligence");
  assert(invitesClientSource.includes("SuggestedInvitationCard"), "invitations suggested tab uses workflow cards");
  assert(
    invitesClientSource.includes("resolveRecommendationPreviewSnapshot"),
    "invites preview uses admin default snapshot when unpublished",
  );
  assert(invitesClientSource.includes("SuggestedMatchesSection"), "invitations suggested tab has matches section");
  assert(invitesClientSource.includes("PublishedInvitationsSection"), "invitations suggested tab has published section");
  assert(invitesClientSource.includes("publishedCopiesForMatching"), "suggested matching uses active inventory only");
  assert(
    invitesClientSource.includes("Review client touch points"),
    "invitations touch points subtitle",
  );
  assert(invitesClientSource.includes("SalonInvitationPreviewModal"), "invitations previews via salon card");
  assert(invitesClientSource.includes("previewOnly"), "invitations draft preview is read-only");
  assert(
    invitesClientSource.includes("No suggested invitations right now."),
    "invitations suggested matches empty state",
  );
  assert(
    fs.readFileSync(path.join(process.cwd(), "components/vmb/salon/PublishedInvitationsSection.tsx"), "utf8").includes(
      "No invitations have been published to your salon yet.",
    ),
    "invitations published empty state",
  );
  assert(
    invitesClientSource.includes("Suggested matches below are previews only"),
    "invitations suggested tab explains unpublished preview state",
  );
  assert(invitesClientSource.includes("SuggestedInviteMatchingDebug"), "invites suggested tab shows match debug");

  const publishedSectionSource = fs.readFileSync(
    path.join(process.cwd(), "components/vmb/salon/PublishedInvitationsSection.tsx"),
    "utf8",
  );
  assert(
    publishedSectionSource.includes("Published Invitations ("),
    "published invitations header shows inventory count",
  );
  assert(
    publishedSectionSource.includes("TAIKOS matching and salon outreach"),
    "published invitations header explains inventory purpose",
  );
  assert(
    publishedSectionSource.includes("PublishedInvitationInventoryCard"),
    "published invitations section uses inventory cards",
  );

  const servicesClientSource = fs.readFileSync(
    path.join(process.cwd(), "components/vmb/salon/SalonServicesClient.tsx"),
    "utf8",
  );
  assert(servicesClientSource.includes("participatingTemplates"), "services page shows participating templates");
  assert(servicesClientSource.includes("buildServiceTemplateParticipation"), "services page maps template participation");

  const birthdayOpportunity = {
    opportunityId: "opp-birthday-grace",
    title: "Birthday celebration",
    category: "Birthday" as const,
    estimatedValue: 85,
    confidence: 0.9,
    recommendation: "Grace Garcia has a birthday this month and loves gel manicures.",
    suggestedAction: "CREATE_INVITE_DRAFT" as const,
    priority: "High" as const,
    score: 92,
  };
  assert(
    opportunityReasonHeadline(birthdayOpportunity) === "Birthday this month",
    "birthday opportunity reason headline",
  );

  const reactivationOpportunity = {
    ...birthdayOpportunity,
    opportunityId: "opp-reactivation-whitney",
    category: "Reactivation" as const,
    recommendation: "Whitney Scott has not returned in 75 days.",
  };
  assert(
    opportunityReasonHeadline(reactivationOpportunity) === "Inactive 75 days",
    "reactivation opportunity reason headline",
  );

  const participationCopy = createSalonLocalCopy(
    {
      ...savedOffer.inviteSnapshot!,
      serviceIds: ["default-nails-gel-manicure"],
      rewardIds: ["addon-chrome", "addon-french"],
    },
    "salon-123",
  );
  const participation = buildServiceTemplateParticipation([participationCopy]);
  assert(
    participatingTemplatesForService(participation, "default-nails-gel-manicure").length === 1,
    "service participation maps published templates",
  );

  const suggested = buildSuggestedInvitationsFromOpportunities(
    [birthdayOpportunity],
    [participationCopy],
    { drafts: [] },
  );
  assert(suggested.length === 1, "suggested invitations built from opportunities");
  assert(suggested[0]!.clientName === "Grace Garcia", "suggested invitation extracts client name");
  assert(suggested[0]!.templateName === "Birthday Celebration", "suggested invitation matches published template");
  assert(suggested[0]!.services.includes("Gel Manicure"), "suggested invitation lists services from snapshot");
  assert(suggested[0]!.rewards.includes("Chrome Upgrade"), "suggested invitation lists rewards from snapshot");
  assert(suggested[0]!.publishedCopy?.id === participationCopy.id, "suggested invitation links published copy");
  assert(suggested[0]!.matchSource !== "none", "suggested invitation records match source");
  assert(!!suggested[0]!.pricing, "suggested card receives pricing summary");
  assert(suggested[0]!.pricing!.totalValue === 70, "suggested pricing uses snapshot services when published");
  assert(suggested[0]!.estimatedValue === suggested[0]!.pricing!.offerPrice, "suggested estimated value uses offer price");

  const unpublishedSuggested = buildSuggestedInvitationsFromOpportunities(
    [birthdayOpportunity],
    [],
    { drafts: [] },
  );
  assert(unpublishedSuggested.length === 1, "unpublished suggested built without inventory");
  assert(!unpublishedSuggested[0]!.publishedCopy, "unpublished suggested has no published copy");
  assert(!!unpublishedSuggested[0]!.pricing, "unpublished suggested still has package pricing");

  const {
    buildApprovalInputFromRecommendation,
    approvalDedupeKeyFromRecommendation,
  } = await import("../lib/vmb/invites/salon-invitation-approval-workflow");
  const pauseSalonId = "suggested-pause-test";
  const pauseInput = buildApprovalInputFromRecommendation(
    pauseSalonId,
    unpublishedSuggested[0]!,
    "pause",
  );
  assert(!("error" in pauseInput), "pause builds without published template");
  assert(pauseInput.status === "paused", "unpublished pause creates paused record");
  assert(pauseInput.sourceCopyId.startsWith("unpublished-"), "unpublished pause uses synthetic copy id");
  const approveBlocked = buildApprovalInputFromRecommendation(
    pauseSalonId,
    unpublishedSuggested[0]!,
    "approve",
  );
  assert("error" in approveBlocked, "approve blocked without published template");
  assert(
    !!approvalDedupeKeyFromRecommendation(pauseSalonId, unpublishedSuggested[0]!),
    "unpublished recommendation has dedupe key for pause filtering",
  );

  const pcnOpportunity = {
    ...birthdayOpportunity,
    opportunityId: "opp-pcn-maria",
    category: "PCN Invite" as const,
    title: "PCN invite for Maria",
    recommendation: "Maria Lopez is a strong PCN candidate.",
    clientName: "Maria Lopez",
  };
  const pcnSnapshot = {
    ...savedOffer.inviteSnapshot!,
    sourceTemplateId: "nails-private-client-network",
    templateName: "Private Client Invite",
    version: 2,
  };
  const pcnCopy = createSalonLocalCopy(pcnSnapshot, "salon-123");
  pcnCopy.sourceTemplateId = `${pcnCopy.salonId}-nails-private-client-network`;
  const pcnSuggested = buildSuggestedInvitationsFromOpportunities([pcnOpportunity], [pcnCopy], {
    drafts: [],
  });
  assert(pcnSuggested.length === 1, "PCN suggested invitation built");
  assert(pcnSuggested[0]!.templateId === "nails-private-client-network", "PCN maps to stable template key");
  assert(!!pcnSuggested[0]!.publishedCopy, "PCN matches published copy via normalized sourceTemplateId");
  assert(
    findPublishedCopyForTemplateId([pcnCopy], "nails-private-client-network").copy?.id === pcnCopy.id,
    "normalized lookup finds salon-prefixed sourceTemplateId",
  );
  assert(
    normalizeSourceTemplateId("salon-123-nails-private-client-network") === "nails-private-client-network",
    "normalize strips salon storage prefix",
  );

  const {
    applySalonInviteLocalCopyPatch,
    duplicateSalonInviteLocalCopy,
    getSalonInviteInventoryStatus,
    publishedCopiesForMatching,
  } = await import("../lib/vmb/invites/salon-invite-inventory");
  const pausedCopy = applySalonInviteLocalCopyPatch(pcnCopy, { inventoryStatus: "paused" });
  assert(getSalonInviteInventoryStatus(pausedCopy) === "paused", "inventory status can be paused");
  assert(publishedCopiesForMatching([pausedCopy]).length === 0, "paused copies skip TAIKOS matching");
  assert(
    findPublishedCopyForTemplateId([pausedCopy], "nails-private-client-network").copy === null,
    "paused inventory is excluded from template matching",
  );
  const duplicated = duplicateSalonInviteLocalCopy(pcnCopy);
  assert(duplicated.id !== pcnCopy.id, "duplicate creates a new inventory copy id");
  assert(duplicated.snapshot.templateName.includes("(Copy)"), "duplicate labels copied template");

  const globalsCss = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
  assert(globalsCss.includes("vmb-published-invite-grid"), "published invite inventory uses responsive grid");

  const salonInvitesRoute = fs.readFileSync(
    path.join(process.cwd(), "app/api/vmb/salon-invites/route.ts"),
    "utf8",
  );
  assert(salonInvitesRoute.includes("salonId"), "salon invites API returns salonId for debug");

  const routesSource = fs.readFileSync(
    path.join(process.cwd(), "lib/vmb/admin/nail-template-routes.ts"),
    "utf8",
  );
  assert(routesSource.includes("/admin/invites/builder"), "canonical builder route exists");
  assert(routesSource.includes("/admin/invites/library"), "canonical library route exists");

  assert(NAIL_OFFER_SERVICE_CHOICES.length === 7, "seven nail service choices for offer editor");
  assert(NAIL_OFFER_ADDON_CHOICES.length === 7, "seven nail add-on choices for offer editor");
  assert(
    resolveNailOfferServiceLabels(["default-nails-gel-manicure"])[0] === "Gel Manicure",
    "offer service labels resolve from curated choices",
  );
  assert(
    resolveNailOfferAddonLabels(["addon-chrome"])[0] === "Chrome Upgrade",
    "offer add-on labels use salon-friendly names",
  );
  assert(
    resolveNailOfferAddonLabels(["addon-french"])[0] === "French Tip Upgrade",
    "french add-on uses French Tip Upgrade label",
  );
  assert(
    resolveNailOfferAddonLabels(["offer-perk-removal-credit"])[0] === "Free Removal",
    "removal perk uses Free Removal label",
  );
  assert(
    toggleOfferIdSelection(["default-nails-gel-x"], "default-nails-gel-x").length === 0,
    "toggle removes selected offer service id",
  );
  assert(
    toggleOfferIdSelection([], "offer-perk-priority-booking").includes("offer-perk-priority-booking"),
    "toggle adds offer perk id",
  );

  const publishRoute = fs.readFileSync(
    path.join(process.cwd(), "app/api/vmb/invite-library/publish/route.ts"),
    "utf8",
  );
  assert(publishRoute.includes("backend"), "publish API returns backend diagnostic");
  assert(publishRoute.includes("copyId"), "publish API returns copyId diagnostic");

  const libraryClient = fs.readFileSync(
    path.join(process.cwd(), "components/vmb/admin/NailsLibraryAdminClient.tsx"),
    "utf8",
  );
  assert(libraryClient.includes("override-dot--published"), "library shows published status on the inventory dot");
  assert(!libraryClient.includes("Publish verification"), "library hides publish verification diagnostics");

  const { resetVmbStorageBackendCache } = await import("../lib/vmb/db");
  const { upsertOffer } = await import("../lib/vmb/offers/offer-store");
  const {
    listSalonInviteLocalCopies,
    publishLibraryTemplateToSalon,
  } = await import("../lib/vmb/invites/salon-invite-local-copy-store");

  const salonId = `invite-copy-test-${Date.now()}`;
  const templateId = "nails-private-client-network";
  const pcnDraft = {
    templateId,
    displayName: "Private Client Invite",
    headline: "Join my network",
    body: "Exclusive access for you",
    ctaLabel: "Join now",
    serviceIds: ["default-nails-gel-manicure"],
    serviceOptionIds: [],
    active: true,
    saved: true,
    offerCategory: "pcn" as const,
  };
  const pcnLibrarySnapshot = buildDraftInviteSnapshot(pcnDraft, {
    ownerName: "Alex",
    salonName: "Glow Nails",
  });
  const pcnOffer = nailTemplateDraftToOffer(pcnDraft, salonId, {
    ...pcnLibrarySnapshot,
    status: "library",
    version: 3,
  });
  const offerSaved = await upsertOffer(salonId, pcnOffer);
  assert(!("error" in offerSaved), "library offer saved before publish");

  resetVmbStorageBackendCache();
  const published = await publishLibraryTemplateToSalon(salonId, templateId);
  assert(
    !("error" in published),
    `publish creates salon invite copy (${"error" in published ? published.error : "ok"})`,
  );
  if (!("error" in published)) {
    assert(published.copy.salonId === salonId, "publish uses target salonId");
    assert(
      published.copy.sourceTemplateId === templateId,
      "publish stores sourceTemplateId on salon copy",
    );
    assert(
      published.backend === "json" || published.backend === "postgres",
      "publish reports storage backend",
    );

    const listed = await listSalonInviteLocalCopies(salonId);
    assert(
      listed.some((row) => row.id === published.copy.id),
      "listSalonInviteLocalCopies reads published copy from same backend",
    );
    assert(listed[0]!.publishedVersion === published.copy.publishedVersion, "listed copy version matches publish");
  }

  const approvalSalonId = `approval-test-${Date.now()}`;
  const {
    approveSalonInvitation,
    listSalonInvitationApprovals,
    pauseSalonInvitationApproval,
  } = await import("../lib/vmb/invites/salon-invitation-approval-store");

  const approvalSnapshot = buildDraftInviteSnapshot(
    {
      templateId: "nails-birthday-celebration",
      displayName: "Birthday Celebration",
      headline: "Happy Birthday Snapshot",
      body: "Celebrate with us",
      ctaLabel: "Book now",
      serviceIds: ["default-nails-gel-x"],
      serviceOptionIds: ["addon-chrome"],
      active: true,
      saved: true,
      offerCategory: "birthday",
    },
    { ownerName: "Alex", salonName: "Glow Nails" },
  );
  assert(approvalSnapshot.totalValue === 110, "approval snapshot freezes total value at build time");
  assert(approvalSnapshot.offerPrice === 95, "approval snapshot freezes offer price at build time");

  const approved = await approveSalonInvitation(approvalSalonId, {
    clientName: "Grace Garcia",
    opportunityId: "opp-birthday-grace",
    opportunityType: "Birthday",
    sourceCopyId: "copy-birthday-v1",
    sourceTemplateId: "nails-birthday-celebration",
    snapshot: { ...approvalSnapshot, status: "published", version: 1 },
    reasonText: "Birthday this month",
    estimatedValue: 85,
  });
  assert(!("error" in approved), "approve suggested invitation creates approved record");
  assert(approved.created === true, "first approval creates a new record");
  assert(approved.approval.snapshot.headline === "Happy Birthday Snapshot", "approved record stores snapshot");

  const duplicate = await approveSalonInvitation(approvalSalonId, {
    clientName: "Grace Garcia",
    opportunityId: "opp-birthday-grace",
    opportunityType: "Birthday",
    sourceCopyId: "copy-birthday-v1",
    sourceTemplateId: "nails-birthday-celebration",
    snapshot: { ...approvalSnapshot, headline: "Changed Headline", status: "published", version: 1 },
    reasonText: "Birthday this month",
    estimatedValue: 85,
  });
  assert(!("error" in duplicate), "duplicate approve returns existing record");
  assert(duplicate.created === false, "duplicate approve does not create duplicate");
  assert(
    duplicate.approval.snapshot.headline === "Happy Birthday Snapshot",
    "approved snapshot stays frozen when approve is retried",
  );
  assert(
    duplicate.approval.snapshot.totalValue === 110,
    "approved snapshot keeps frozen pricing when approve is retried",
  );
  assert(
    duplicate.approval.snapshot.offerPrice === 95,
    "approved snapshot keeps frozen offer price when approve is retried",
  );
  const approvalRows = await listSalonInvitationApprovals(approvalSalonId);
  assert(approvalRows.length === 1, "approved record persists in store");

  const paused = await pauseSalonInvitationApproval(approvalSalonId, {
    clientName: "Maria Lopez",
    opportunityId: "opp-pcn-maria",
    opportunityType: "PCN",
    sourceCopyId: "copy-pcn-v1",
    sourceTemplateId: "nails-private-client-network",
    snapshot: { ...approvalSnapshot, templateName: "Private Client Invite", status: "published", version: 2 },
    reasonText: "Private client invite candidate",
    estimatedValue: 120,
    status: "paused",
  });
  assert(!("error" in paused), "pause creates paused approval record");
  const pausedRows = await listSalonInvitationApprovals(approvalSalonId).then((rows) =>
    rows.filter((row) => row.status === "paused"),
  );
  assert(pausedRows.length === 1, "paused record appears in store");

  const approvalsRoute = fs.readFileSync(
    path.join(process.cwd(), "app/api/vmb/salon-invitation-approvals/route.ts"),
    "utf8",
  );
  assert(approvalsRoute.includes("listSalonInvitationApprovals"), "approval API route exists");

  const invitesClientSource2 = fs.readFileSync(
    path.join(process.cwd(), "components/vmb/VmbInvitesClient.tsx"),
    "utf8",
  );
  assert(invitesClientSource2.includes('"approved"'), "invites client exposes Approved tab");
  assert(invitesClientSource2.includes("ApprovedInvitationsSection"), "invites client renders approved section");
  assert(
    invitesClientSource2.includes("salon-invitation-approvals"),
    "invites client loads approval records",
  );

  const { buildSendPackageCopy } = await import("../lib/vmb/invites/send-package-copy");
  const birthdayCopy = buildSendPackageCopy({
    id: "approval-1",
    salonId: approvalSalonId,
    clientName: "Grace Garcia",
    opportunityType: "Birthday",
    sourceCopyId: "copy-birthday-v1",
    sourceTemplateId: "nails-birthday-celebration",
    snapshot: { ...approvalSnapshot, ownerName: "Jenny Nguyen", status: "published", version: 1 },
    reasonText: "Birthday this month",
    status: "approved",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  assert(
    birthdayCopy.subjectLine.includes("birthday surprise from Jenny"),
    "birthday send package subject uses provider name",
  );

  const pcnSendCopy = buildSendPackageCopy({
    id: "approval-2",
    salonId: approvalSalonId,
    clientName: "Maria Lopez",
    opportunityType: "PCN",
    sourceCopyId: "copy-pcn-v1",
    sourceTemplateId: "nails-private-client-network",
    snapshot: { ...approvalSnapshot, ownerName: "Jenny Nguyen", templateName: "Private Client Invite", status: "published", version: 2 },
    reasonText: "Private client invite candidate",
    status: "approved",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  assert(
    pcnSendCopy.subjectLine.includes("Jenny invited you into her private client network"),
    "PCN send package subject matches static copy",
  );
  assert(pcnSendCopy.envelopeCtaLabel === "Open My Invitation", "send package envelope CTA is static");

  const sendPackageModalSource = fs.readFileSync(
    path.join(process.cwd(), "components/vmb/salon/SendPackagePreviewModal.tsx"),
    "utf8",
  );
  assert(sendPackageModalSource.includes("buildSendPackageCopy"), "send package modal uses copy helper");
  assert(sendPackageModalSource.includes("SalonInviteCard"), "send package modal previews invitation card");

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
