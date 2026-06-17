/**
 * npm run test:vmb:card-builder-images
 */
import { buildPreviewFromTemplate } from "../lib/vmb/card-templates/apply-card-template";
import {
  applyCardBuilderImagesToPreview,
  createInitialCardBuilderImageSlots,
  isCardBuilderImageFile,
  resolveOwnerPhotoFromPreviewSlots,
} from "../lib/vmb/card-templates/card-builder-preview-images";
import { buildOwnerPreviewCaption } from "../lib/vmb/cards/card-owner-preview-copy";
import { getDefaultTemplate } from "../lib/vmb/card-templates/default-card-templates";
import { CARD_TEMPLATE_PREVIEW_CONTEXT } from "../lib/vmb/card-templates/default-card-templates";
import { queuedInviteCardToPreviewModel } from "../lib/vmb/invites/queued-invite-card-to-preview-model";
import fs from "fs";
import path from "path";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function basePcnPreview() {
  const template = getDefaultTemplate("pcn_invite");
  return buildPreviewFromTemplate(
    template,
    {
      cardType: "pcn_invite",
      recipientName: CARD_TEMPLATE_PREVIEW_CONTEXT.clientName,
      salonName: CARD_TEMPLATE_PREVIEW_CONTEXT.salonName,
      techName: CARD_TEMPLATE_PREVIEW_CONTEXT.ownerName,
      serviceName: CARD_TEMPLATE_PREVIEW_CONTEXT.serviceName,
    },
    CARD_TEMPLATE_PREVIEW_CONTEXT.ownerName,
  );
}

function run(): void {
  const emptyTemplatePreview = basePcnPreview();
  assert(emptyTemplatePreview.imageSlots.length > 0, "templates without builder images still render placeholders");

  const slots = createInitialCardBuilderImageSlots();
  assert(slots.length === 3, "builder exposes three fixed slots");

  // Slot 1 → preview
  const slot1Draft = createInitialCardBuilderImageSlots();
  slot1Draft[0] = { previewUrl: "blob:service-1", fileName: "service-1.jpg" };
  const slot1Preview = applyCardBuilderImagesToPreview(basePcnPreview(), slot1Draft);
  assert(slot1Preview.imageLayout === "single", "slot 1 alone uses single layout");
  assert(slot1Preview.imageSlots[0]?.previewUrl === "blob:service-1", "slot 1 image reaches preview");
  assert(slot1Preview.imageSlots[0]?.role === "service", "slot 1 is a service image");

  // Slot 2 → preview
  const slot2Draft = createInitialCardBuilderImageSlots();
  slot2Draft[1] = { previewUrl: "blob:service-2", fileName: "service-2.jpg" };
  const slot2Preview = applyCardBuilderImagesToPreview(basePcnPreview(), slot2Draft);
  assert(slot2Preview.imageLayout === "single", "slot 2 alone uses single layout");
  assert(slot2Preview.imageSlots[0]?.previewUrl === "blob:service-2", "slot 2 image reaches preview");

  // Slot 3 owner photo → preview
  const slot3Draft = createInitialCardBuilderImageSlots("https://example.com/owner.jpg");
  const slot3Preview = applyCardBuilderImagesToPreview(basePcnPreview(), slot3Draft);
  assert(slot3Preview.imageLayout === "single", "owner photo alone uses single layout");
  assert(slot3Preview.imageSlots[0]?.role === "owner", "slot 3 preview marks owner role");
  assert(
    resolveOwnerPhotoFromPreviewSlots(slot3Preview.imageSlots) === "https://example.com/owner.jpg",
    "owner photo resolves from preview slots",
  );

  // Remove slot → remaining layout
  const twoThenOne = createInitialCardBuilderImageSlots();
  twoThenOne[0] = { previewUrl: "blob:a", fileName: "a.jpg" };
  twoThenOne[1] = { previewUrl: "blob:b", fileName: "b.jpg" };
  const dualPreview = applyCardBuilderImagesToPreview(basePcnPreview(), twoThenOne);
  assert(dualPreview.imageLayout === "dual", "two service images use dual layout");
  delete twoThenOne[1]!.previewUrl;
  const backToSingle = applyCardBuilderImagesToPreview(basePcnPreview(), twoThenOne);
  assert(backToSingle.imageLayout === "single", "removing a slot returns single-image layout");

  // Three images → collage with owner tile
  const fullDraft = createInitialCardBuilderImageSlots();
  fullDraft[0] = { previewUrl: "blob:s1", fileName: "s1.jpg" };
  fullDraft[1] = { previewUrl: "blob:s2", fileName: "s2.jpg" };
  fullDraft[2] = { previewUrl: "blob:owner", fileName: "owner.jpg" };
  const collagePreview = applyCardBuilderImagesToPreview(basePcnPreview(), fullDraft);
  assert(collagePreview.imageLayout === "collage", "three images use collage layout");
  assert(collagePreview.imageSlots.length === 3, "collage keeps three positioned slots");
  assert(collagePreview.imageSlots[2]?.role === "owner", "third collage tile is owner photo");

  // Drag/drop file acceptance
  assert(isCardBuilderImageFile({ type: "image/png" }), "accepts image/png");
  assert(!isCardBuilderImageFile({ type: "application/pdf" }), "rejects non-image files");

  // Recipient payload must not carry admin builder blobs
  const recipientModel = queuedInviteCardToPreviewModel(
    {
      cardType: "pcn_invite",
      actionLabel: "Claim",
      greeting: "Hi",
      primaryCta: "Book",
      recipientName: "Grace",
    },
    { salonDisplayName: "Salon", techName: "Jenny" },
  );
  assert(recipientModel.imageSlots.length === 0, "recipient preview has no admin image slots");
  assert(
    !JSON.stringify(recipientModel).includes("blob:"),
    "recipient preview payload does not leak admin blob URLs",
  );

  const cardHeroSource = fs.readFileSync(
    path.join(process.cwd(), "components/vmb/cards/CardHero.tsx"),
    "utf8",
  );
  assert(cardHeroSource.includes("OwnerIdentityPanel"), "CardHero renders dedicated owner identity panel");
  assert(cardHeroSource.includes("ServiceImageTile"), "CardHero keeps service images rectangular");
  assert(cardHeroSource.includes("owner-identity--empty"), "missing owner photo uses neutral placeholder");
  assert(
    buildOwnerPreviewCaption("Jenny") === "A note from Jenny",
    "owner preview caption personalizes sender",
  );
  assert(!cardHeroSource.includes("avatar-inner"), "CardHero does not render fake person tile");

  const personalInviteSource = fs.readFileSync(
    path.join(process.cwd(), "components/vmb/cards/PersonalInvitePreview.tsx"),
    "utf8",
  );
  assert(personalInviteSource.includes("<CardHero"), "salon invite preview renders CardHero from model slots");
  assert(!personalInviteSource.includes("avatar-inner"), "salon invite band avoids fake person placeholder");

  const templateBuilderSource = fs.readFileSync(
    path.join(process.cwd(), "components/vmb/admin/TemplateBuilderAdminClient.tsx"),
    "utf8",
  );
  assert(templateBuilderSource.includes("ownerName"), "template builder accepts owner name for preview tokens");

  console.log("OK: VMB card builder image tests passed");
}

run();
