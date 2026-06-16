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
  assembleRelationshipFirstInviteMessage,
  getRelationshipFirstCard,
  listRelationshipFirstInviteCards,
  RELATIONSHIP_FIRST_CARD_IDS,
  STALE_REFERRAL_COPY_MARKERS,
} from "../lib/vmb/cards/relationship-first-invite-copy";
import { VMB_CARD_TYPES } from "../lib/vmb/cards/card-types";
import { buildOutreachDraftCopy } from "../lib/vmb/invites/outreach-message-presets";
import { queuedInviteCardToPreviewModel } from "../lib/vmb/invites/queued-invite-card-to-preview-model";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const CARD_EXPECTATIONS: Record<
  (typeof RELATIONSHIP_FIRST_CARD_IDS)[number],
  { opener: string; cta: string }
> = {
  private_client_network: {
    opener: "I want to invite you into my Private Client Network.",
    cta: "Join My Private Client Network",
  },
  refresh_reminder: {
    opener: "I was looking at my calendar and realized it's been since {lastAppointmentDate} since I've seen you.",
    cta: "Book My Usual Appointment",
  },
  we_miss_you: {
    opener: "It's been a while since our last visit and I wanted to check in.",
    cta: "Let's Catch Up",
  },
  open_chair: {
    opener: "A cancellation just opened a spot on my calendar and I immediately thought of you.",
    cta: "Claim This Opening",
  },
  referral_invite: {
    opener: "We've built a great relationship over the years",
    cta: "Invite Someone You Love",
  },
  vip_thank_you: {
    opener: "I wanted to personally thank you.",
    cta: "Enjoy Your VIP Gift",
  },
  birthday_celebration: {
    opener: "Happy Birthday!",
    cta: "Enjoy Your Birthday Gift",
  },
  new_client_welcome: {
    opener: "Thank you for booking with me.",
    cta: "See Appointment Details",
  },
  first_visit_thank_you: {
    opener: "Thank you for spending part of your day with me.",
    cta: "Stay Connected",
  },
  favorite_providers: {
    opener: "One of my favorite things about this business is connecting great people with great professionals.",
    cta: "Share Your Favorites",
  },
};

function run(): void {
  assert(RELATIONSHIP_FIRST_CARD_IDS.length === 10, "ten relationship-first cards defined");
  assert(listRelationshipFirstInviteCards().length === 10, "listRelationshipFirstInviteCards returns ten");

  for (let index = 0; index < RELATIONSHIP_FIRST_CARD_IDS.length; index += 1) {
    const id = RELATIONSHIP_FIRST_CARD_IDS[index]!;
    const expected = CARD_EXPECTATIONS[id];
    const card = getRelationshipFirstCard(id);
    assert(card.messageTemplate.includes(expected.opener), `${index + 1}. ${id} uses canonical opener`);
    assert(card.primaryCta === expected.cta, `${index + 1}. ${id} uses canonical CTA`);
    assert(card.greetingTemplate === "Dear {clientName},", `${index + 1}. ${id} uses Dear greeting`);
    assert(card.signatureTemplate === "{ownerName} 💕", `${index + 1}. ${id} uses owner signature`);
  }

  const assembledPcn = assembleRelationshipFirstInviteMessage(getRelationshipFirstCard("private_client_network"), {
    clientName: "Grace",
    ownerName: "Jenny",
  });
  assert(assembledPcn.startsWith("Dear Grace,"), "assembled PCN starts with Dear Grace");
  assert(assembledPcn.includes("Private Client Network"), "assembled PCN includes network invite");
  assert(assembledPcn.includes("Jenny 💕"), "assembled PCN includes signature");

  const newClientOutreach = buildOutreachDraftCopy("new_client_welcome", {
    salonName: "Test Salon",
    clientName: "Grace",
    ownerName: "Jenny",
  }).editableMessage;
  assert(newClientOutreach.includes("Dear Grace,"), "new client welcome uses Dear greeting");
  assert(newClientOutreach.includes("Thank you for booking with me."), "new client welcome uses revised booking copy");
  assert(newClientOutreach.includes("See Appointment Details") === false, "CTA stays out of editable outreach body");
  assert(!newClientOutreach.toLowerCase().includes("last visit"), "new client welcome avoids previous visit language");

  const firstVisitOutreach = buildOutreachDraftCopy("revenue_touch", {
    salonName: "Test Salon",
    clientName: "Grace",
    ownerName: "Jenny",
  }).editableMessage;
  assert(firstVisitOutreach.includes("Stay Connected") === false, "first visit CTA stays out of editable body");
  assert(firstVisitOutreach.includes("Thank you for spending part of your day with me."), "first visit uses canonical copy");

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
  assert(refreshRendered.includes("\n\n"), "refresh reminder preserves paragraph breaks");

  const referral = getRelationshipFirstCard("referral_invite");
  for (const marker of STALE_REFERRAL_COPY_MARKERS) {
    if (marker === "Invite Someone You Care About") continue;
    assert(!referral.messageTemplate.includes(marker), `referral message lacks stale marker: ${marker}`);
  }

  assert(VMB_CARD_TYPES[0] === "pcn_invite", "card type 1 is Private Client Network");
  assert(VMB_CARD_TYPES[3] === "open_slot_fill", "card type 4 is Opening Just Became Available");
  assert(VMB_CARD_TYPES[7] === "service_card", "card type 8 is Favorite Providers");

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
