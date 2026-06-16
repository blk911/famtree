/**
 * npm run test:vmb:invite-preset-admin
 */
import fs from "node:fs";
import path from "node:path";
import {
  INVITES_ADMIN_ROUTES,
  INVITES_OPERATING_CARDS,
} from "../lib/admin/invites-workspace";
import { DEFAULT_CARD_TEMPLATES } from "../lib/vmb/card-templates/default-card-templates";
import { getDefaultCtaForTemplateType } from "../lib/vmb/card-templates/template-cta-labels";
import { buildPersonalInviteCopy } from "../lib/vmb/cards/personal-invite-copy";
import {
  buildOutreachDraftCopy,
  listOutreachMessagePresets,
  OUTREACH_MESSAGE_PRESETS,
  VMB_INVITE_PRESET_SOURCE_MODULES,
} from "../lib/vmb/invites/outreach-message-presets";
import { getAllDefaultOffers } from "../lib/vmb/offers/default-offers";
import { getAllDefaultServices } from "../lib/vmb/services/default-service-catalog";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

function read(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

function routePageExists(routePath: string): boolean {
  const afterAdmin = routePath.replace(/^\/admin\//, "");
  const segments = afterAdmin.split("/").filter(Boolean);
  return fs.existsSync(
    path.join(process.cwd(), "app", "(app)", "admin", "(platform)", ...segments, "page.tsx"),
  );
}

function run(): void {
  for (const rel of Object.values(VMB_INVITE_PRESET_SOURCE_MODULES)) {
    assert(fs.existsSync(path.join(process.cwd(), rel)), `canonical preset source exists: ${rel}`);
  }

  assert(OUTREACH_MESSAGE_PRESETS.length === 4, "four outreach presets defined");
  assert(listOutreachMessagePresets().length === 4, "listOutreachMessagePresets returns catalog");
  assert(
    buildOutreachDraftCopy("private_client_network", {
      salonName: "Test Salon",
      clientName: "Grace",
    }).subject.includes("Test Salon"),
    "outreach draft copy renders from preset",
  );
  assert(DEFAULT_CARD_TEMPLATES.length > 0, "card template defaults importable");
  assert(getAllDefaultOffers().length > 0, "offer defaults importable");
  assert(getAllDefaultServices().length > 0, "service defaults importable");
  assert(getDefaultCtaForTemplateType("pcn_invite").length > 0, "CTA labels importable");
  assert(
    buildPersonalInviteCopy({ recipientName: "Grace", salonName: "Salon" }).primaryCta.length > 0,
    "personal invite copy importable",
  );

  assert(routePageExists(INVITES_ADMIN_ROUTES.outreach), "/admin/invites/outreach page exists");

  const hubCard = INVITES_OPERATING_CARDS.find((card) => card.id === "outreach");
  assert(Boolean(hubCard), "invites hub includes outreach card");
  assert(hubCard?.label === "Outreach Messages", "outreach card label is Outreach Messages");
  assert(hubCard?.href === INVITES_ADMIN_ROUTES.outreach, "hub links to outreach route");

  const labels = INVITES_OPERATING_CARDS.filter((card) =>
    ["templates", "offers", "services", "outreach"].includes(card.id),
  ).map((card) => card.label);
  assert(labels.includes("Card Templates"), "Card Templates label present");
  assert(labels.includes("Offers"), "Offers label present");
  assert(labels.includes("Services"), "Services label present");
  assert(labels.includes("Outreach Messages"), "Outreach Messages label present");

  const outreachPage = read("app/(app)/admin/(platform)/invites/outreach/page.tsx");
  assert(outreachPage.includes("OutreachMessagesAdminClient"), "outreach admin page renders client");

  const inviteModal = read("components/vmb/dashboard/InviteDraftPreviewModal.tsx");
  assert(inviteModal.includes("outreach-message-presets"), "send modal uses canonical outreach footer");
  assert(
    !inviteModal.includes("Reply links coming soon.`"),
    "send modal has no hardcoded outreach footer string",
  );

  const buildAnalysis = read("lib/vmb/invites/build-invite-drafts-for-analysis.ts");
  assert(buildAnalysis.includes("buildOutreachDraftCopy"), "analysis draft builder uses outreach presets");
  assert(
    !buildAnalysis.includes("Reply YES and we'll send your personal link."),
    "analysis builder has no duplicate outreach body",
  );

  const buildRecords = read("lib/vmb/invite-drafts/build-invite-drafts.ts");
  assert(buildRecords.includes("buildOutreachDraftCopy"), "demo draft builder uses outreach presets");
  assert(
    !buildRecords.includes("Reply STOP to opt out."),
    "demo draft builder has no duplicate footer string",
  );

  const cardPreviewModal = read("components/vmb/cards/CardPreviewModal.tsx");
  assert(
    cardPreviewModal.includes("buildPersonalInviteCopy"),
    "product card preview modal still uses canonical personal invite copy",
  );

  console.log("OK: VMB invite preset admin tests passed");
}

run();
