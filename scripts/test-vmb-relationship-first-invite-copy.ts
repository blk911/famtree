/**
 * npm run test:vmb:relationship-first-copy
 */
import fs from "node:fs";
import path from "node:path";
import { buildPreviewFromTemplate } from "../lib/vmb/card-templates/apply-card-template";
import { getDefaultTemplate } from "../lib/vmb/card-templates/default-card-templates";
import { CARD_TEMPLATE_PREVIEW_CONTEXT } from "../lib/vmb/card-templates/default-card-templates";
import { getDefaultCtaForTemplateType } from "../lib/vmb/card-templates/template-cta-labels";
import { applyTemplateTokens, buildTemplateTokenContext } from "../lib/vmb/card-templates/template-tokens";
import { buildPersonalInviteCopy } from "../lib/vmb/cards/personal-invite-copy";
import {
  getRelationshipFirstCard,
  listRelationshipFirstInviteCards,
  RELATIONSHIP_FIRST_CARD_IDS,
  STALE_REFERRAL_COPY_MARKERS,
} from "../lib/vmb/cards/relationship-first-invite-copy";
import { buildOutreachDraftCopy } from "../lib/vmb/invites/outreach-message-presets";
import { VMB_CARD_TYPES } from "../lib/vmb/cards/card-types";
import { queuedInviteCardToPreviewModel } from "../lib/vmb/invites/queued-invite-card-to-preview-model";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function run(): void {
  assert(RELATIONSHIP_FIRST_CARD_IDS.length === 10, "ten relationship-first cards defined");
  assert(listRelationshipFirstInviteCards().length === 10, "listRelationshipFirstInviteCards returns ten");

  const referral = getRelationshipFirstCard("referral_invite");
  assert(
    referral.messageTemplate.includes("We've built a great relationship over the years"),
    "referral invite uses revised relationship-first opener",
  );
  assert(referral.primaryCta === "Invite Someone You Love", "referral CTA updated");

  const newClientOutreach = buildOutreachDraftCopy("new_client_welcome", {
    salonName: "Test Salon",
    clientName: "Grace",
  }).editableMessage.toLowerCase();
  assert(!newClientOutreach.includes("last visit"), "new client welcome avoids previous visit language");
  assert(newClientOutreach.includes("thank you for booking"), "new client welcome uses revised booking copy");

  const refresh = getDefaultTemplate("refresh_card");
  const refreshRendered = applyTemplateTokens(refresh.messageTemplate, {
    ...buildTemplateTokenContext(
      {
        cardType: "refresh_card",
        recipientName: "Grace",
        serviceName: "Gel-X",
        lastVisit: "May 12",
      },
      "Jenny",
    ),
  });
  assert(refreshRendered.includes("May 12"), "refresh reminder resolves lastAppointmentDate alias");

  for (const marker of STALE_REFERRAL_COPY_MARKERS) {
    if (marker === "Invite Someone You Care About") continue;
    assert(!referral.messageTemplate.includes(marker), `referral message lacks stale marker: ${marker}`);
  }

  const defaultTemplatesSource = fs.readFileSync(
    path.join(process.cwd(), "lib/vmb/card-templates/default-card-templates.ts"),
    "utf8",
  );
  assert(
    !defaultTemplatesSource.includes("My relationship with you is the reason"),
    "default templates removed prior referral opener",
  );

  for (const type of VMB_CARD_TYPES) {
    const template = getDefaultTemplate(type);
    const preview = buildPreviewFromTemplate(
      template,
      {
        cardType: type,
        recipientName: CARD_TEMPLATE_PREVIEW_CONTEXT.clientName,
        salonName: CARD_TEMPLATE_PREVIEW_CONTEXT.salonName,
        techName: CARD_TEMPLATE_PREVIEW_CONTEXT.ownerName,
        serviceName: CARD_TEMPLATE_PREVIEW_CONTEXT.serviceName,
        lastVisit: CARD_TEMPLATE_PREVIEW_CONTEXT.lastVisit,
        visitCount: CARD_TEMPLATE_PREVIEW_CONTEXT.visitCount,
        nextOpening: CARD_TEMPLATE_PREVIEW_CONTEXT.nextOpening,
      },
      CARD_TEMPLATE_PREVIEW_CONTEXT.ownerName,
    );
    assert(preview.body.length > 0 || Boolean(preview.inviteCopy), `${type} preview renders body or invite copy`);
    assert(preview.cta === getDefaultCtaForTemplateType(type), `${type} preview uses relationship-first CTA`);
  }

  const pcnFallback = buildPersonalInviteCopy({
    recipientName: "Grace",
    techName: "Jenny",
    salonName: "Salon",
  });
  assert(
    pcnFallback.personalConnection.includes("Private Client Network"),
    "personal invite fallback uses revised PCN opener",
  );

  const recipient = queuedInviteCardToPreviewModel(
    {
      cardType: "pcn_invite",
      actionLabel: "Join",
      greeting: "Dear Grace,",
      primaryCta: "Join",
      recipientName: "Grace",
      personalConnection: "Hello",
      inviteMessage: "Welcome",
    },
    { salonDisplayName: "Salon", techName: "Jenny" },
  );
  assert(!JSON.stringify(recipient).includes("blob:"), "recipient preview stays free of admin draft blobs");

  console.log("OK: VMB relationship-first invite copy tests passed");
}

run();
