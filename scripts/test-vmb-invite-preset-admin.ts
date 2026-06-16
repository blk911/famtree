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
  buildOutreachDraftCopyFromPreset,
  listOutreachMessagePresets,
  OUTREACH_MESSAGE_PRESETS,
  VMB_INVITE_PRESET_SOURCE_MODULES,
} from "../lib/vmb/invites/outreach-message-presets";
import {
  buildOutreachDraftCopyForSalon,
  clearSalonOutreachPresets,
  getOutreachPresetsForSalon,
  resetOutreachPresetToDefault,
  upsertOutreachPresetOverride,
} from "../lib/vmb/invites/outreach-preset-store";
import { buildInviteDraftsForAnalysis } from "../lib/vmb/invites/build-invite-drafts-for-analysis";
import { getAllDefaultOffers } from "../lib/vmb/offers/default-offers";
import { getAllDefaultServices } from "../lib/vmb/services/default-service-catalog";
import { mockAiosAdapter } from "../lib/taikos/adapters/mock";
import { runVmbBookAnalysis } from "../lib/vmb/run-book-analysis";
import { VMB_SAMPLE_BOOK_TEXT } from "../lib/vmb/sample-book";
import { createVmbTrialLead } from "../lib/vmb/trial-store";

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

async function testOutreachPresetStore(): Promise<void> {
  const salonId = `outreach-store-${Date.now()}`;
  await clearSalonOutreachPresets(salonId);

  const defaults = await getOutreachPresetsForSalon(salonId);
  assert(defaults.length === 4, "store loads four default presets");
  assert(defaults.every((preset) => preset.isDefault), "initial presets are defaults");
  assert(defaults.every((preset) => preset.active), "defaults are active");

  const saved = await upsertOutreachPresetOverride(salonId, {
    id: "private_client_network",
    label: "Custom PCN Outreach",
    subjectTemplate: "Custom subject for {salonName}",
    messageTemplate: "Custom body for {firstName}",
    active: true,
  });
  assert(!("error" in saved), "update preset succeeds");
  if ("error" in saved) return;
  assert(saved.preset.label === "Custom PCN Outreach", "updated label persisted");

  const storedCopy = await buildOutreachDraftCopyForSalon(salonId, "private_client_network", {
    salonName: "Stored Salon",
    clientName: "Grace",
  });
  assert(storedCopy.subject.includes("Stored Salon"), "draft builders consume stored override");
  assert(storedCopy.editableMessage.includes("Grace"), "stored message template renders");

  const inactive = await upsertOutreachPresetOverride(salonId, {
    id: "private_client_network",
    active: false,
  });
  assert(!("error" in inactive), "inactive override saves");
  const inactiveCopy = await buildOutreachDraftCopyForSalon(salonId, "private_client_network", {
    salonName: "Fallback Salon",
    clientName: "Grace",
  });
  assert(
    inactiveCopy.subject.includes("Fallback Salon") && !inactiveCopy.subject.includes("Custom subject"),
    "inactive preset not selected by draft builders",
  );

  const reset = await resetOutreachPresetToDefault(salonId, "private_client_network");
  assert(!("error" in reset), "reset preset succeeds");
  if ("error" in reset) return;
  assert(reset.preset.isDefault, "reset returns default preset");

  await clearSalonOutreachPresets(salonId);
}

async function testDraftBuilderUsesStore(): Promise<void> {
  const salonId = `outreach-builder-${Date.now()}`;
  await clearSalonOutreachPresets(salonId);

  const trial = await createVmbTrialLead({
    salonName: "Builder Salon",
    ownerName: "Jenny",
    email: `${salonId}@salon.test`,
  });
  if ("error" in trial) {
    process.exit(1);
  }

  const analyzed = await runVmbBookAnalysis({
    trialId: trial.lead.id,
    salonName: trial.lead.salonName,
    providerPlatform: "vagaro",
    rawText: VMB_SAMPLE_BOOK_TEXT,
    sourceType: "sample",
  });
  assert(analyzed.ok, "analysis for draft builder test");
  if (!analyzed.ok) return;

  await upsertOutreachPresetOverride(salonId, {
    id: "private_client_network",
    subjectTemplate: "Builder override for {salonName}",
    messageTemplate: "Builder message for {firstName}",
    active: true,
  });

  const built = await buildInviteDraftsForAnalysis(analyzed.data.analysis, salonId);
  const pcn = built.find((draft) => draft.inviteCategory === "private_client_network");
  assert(Boolean(pcn), "builder produces PCN draft");
  assert(Boolean(pcn?.subject?.includes("Builder override")), "builder uses stored outreach preset");

  await clearSalonOutreachPresets(salonId);
}

async function run(): Promise<void> {
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
    "default outreach draft copy renders from preset",
  );
  assert(
    buildOutreachDraftCopyFromPreset(OUTREACH_MESSAGE_PRESETS[0]!, {
      salonName: "From Preset",
      clientName: "Grace",
    }).subject.includes("From Preset"),
    "buildOutreachDraftCopyFromPreset works",
  );

  await testOutreachPresetStore();
  await testDraftBuilderUsesStore();

  assert(routePageExists(INVITES_ADMIN_ROUTES.outreach), "/admin/invites/outreach page exists");
  assert(fs.existsSync(path.join(process.cwd(), "app/api/vmb/outreach-presets/route.ts")), "outreach presets API exists");

  const hubCard = INVITES_OPERATING_CARDS.find((card) => card.id === "outreach");
  assert(Boolean(hubCard), "invites hub includes outreach card");

  const adminClient = read("components/vmb/admin/OutreachMessagesAdminClient.tsx");
  assert(adminClient.includes("/api/vmb/outreach-presets"), "admin client loads outreach presets API");
  assert(adminClient.includes("Save preset"), "outreach admin renders editable save control");
  assert(adminClient.includes("Reset to default"), "outreach admin renders reset control");
  assert(!adminClient.includes("OUTREACH_MESSAGE_PRESETS"), "admin UI does not embed preset arrays");

  const inviteModal = read("components/vmb/dashboard/InviteDraftPreviewModal.tsx");
  assert(inviteModal.includes("outreach-message-presets"), "send modal uses canonical outreach footer helper");

  const buildAnalysis = read("lib/vmb/invites/build-invite-drafts-for-analysis.ts");
  assert(buildAnalysis.includes("buildOutreachDraftCopyForSalon"), "analysis draft builder uses store");

  assert(DEFAULT_CARD_TEMPLATES.length > 0, "card template defaults importable");
  assert(getAllDefaultOffers().length > 0, "offer defaults importable");
  assert(getAllDefaultServices().length > 0, "service defaults importable");
  assert(getDefaultCtaForTemplateType("pcn_invite").length > 0, "CTA labels importable");
  assert(
    buildPersonalInviteCopy({ recipientName: "Grace", salonName: "Salon" }).primaryCta.length > 0,
    "personal invite copy importable",
  );

  void mockAiosAdapter;

  console.log("OK: VMB invite preset admin tests passed");
}

void run();
