/**
 * npm run test:vmb:demo-login
 */
import { bootstrapVmbDemoSession, buildVmbTodayHref } from "../lib/vmb/bootstrap-vmb-demo";
import { resolveActiveBook } from "../lib/vmb/active-book-resolver";
import { resolveVmbDemoSeedBookPath } from "../lib/vmb/demo-seed-book";
import { runVmbBookAnalysis } from "../lib/vmb/run-book-analysis";
import { VMB_SAMPLE_BOOK_TEXT } from "../lib/vmb/sample-book";
import { createVmbTrialLead } from "../lib/vmb/trial-store";
import {
  resolveVmbMvpLogin,
  validateVmbMvpLoginCredentials,
  VMB_MVP_LOGIN_EMAIL,
  VMB_MVP_LOGIN_PASSWORD,
} from "../lib/vmb/vmb-mvp-login";
import { ensureVmbDemoSalon, VMB_DEMO_SALON_ID } from "../lib/vmb/vmb-demo-salon";
import { listSalonInviteLocalCopies } from "../lib/vmb/invites/salon-invite-local-copy-store";
import { isSalonInviteMatchingActive } from "../lib/vmb/invites/salon-invite-inventory";
import {
  getActiveSalonFacingServicesForCategory,
  upsertSalonServiceConfig,
} from "../lib/vmb/services/salon-service-config-store";
import { upsertWorkspaceForTrial } from "../lib/vmb/workspace-store";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

async function run(): Promise<void> {
  const seedPath = await resolveVmbDemoSeedBookPath();
  assert(!!seedPath, "demo seed book.csv is available");
  console.log(`  seed: ${seedPath}`);

  const demo = await bootstrapVmbDemoSession();
  assert(demo.ok, "demo bootstrap succeeds");
  if (!demo.ok) process.exit(1);
  assert(demo.trialId.startsWith("vmb-trial-"), "demo creates trial");
  assert(demo.analysisId.startsWith("analysis-"), "demo creates analysis");
  assert(demo.clientCount > 0, "demo parses client records");
  assert(
    demo.redirectTo === buildVmbTodayHref(demo.analysisId),
    "demo redirect targets Today with analysis",
  );

  const active = await resolveActiveBook(demo.trialId, {});
  assert(active.hasActiveBook, "demo sets active book");
  assert(active.analysisId === demo.analysisId, "active book matches demo analysis");

  assert(
    validateVmbMvpLoginCredentials(VMB_MVP_LOGIN_EMAIL, VMB_MVP_LOGIN_PASSWORD),
    "mvp login accepts test@test.com / whisper",
  );
  assert(!validateVmbMvpLoginCredentials("wrong@test.com", "nope"), "invalid credentials rejected");

  const seededDemo = await ensureVmbDemoSalon();
  assert(seededDemo.ok, "persistent demo salon seed succeeds");
  if (!seededDemo.ok) process.exit(1);
  assert(seededDemo.trialId === VMB_DEMO_SALON_ID, "persistent demo uses stable salon id");
  assert(seededDemo.serviceCount > 0, "persistent demo activates salon services");
  assert(seededDemo.inviteTypeCount > 0, "persistent demo approves invite types");
  const demoServices = await getActiveSalonFacingServicesForCategory(VMB_DEMO_SALON_ID, "nails");
  assert(demoServices.length > 0, "persistent demo services load active");
  const demoGelX = demoServices.find((service) => service.serviceOfferId === "default-nails-gel-x");
  assert(Boolean(demoGelX), "persistent demo includes Gel-X service");
  if (!demoGelX) process.exit(1);
  const customGelX = await upsertSalonServiceConfig(VMB_DEMO_SALON_ID, {
    catalogServiceId: "default-nails-gel-x",
    lifecycleAction: "activate",
    priceCents: demoGelX.priceCents,
    durationMinutes: demoGelX.durationMinutes,
    enabledAddonIds: ["addon-chrome", "addon-crystals"],
    addonPriceCentsById: Object.fromEntries(demoGelX.addons.map((addon) => [addon.addonId, addon.priceCents])),
  });
  assert(!("error" in customGelX), "test can customize persistent demo Gel-X add-ons");
  const repairedDemo = await ensureVmbDemoSalon();
  assert(repairedDemo.ok, "persistent demo repair succeeds after customization");
  const repairedServices = await getActiveSalonFacingServicesForCategory(VMB_DEMO_SALON_ID, "nails");
  const repairedGelX = repairedServices.find((service) => service.serviceOfferId === "default-nails-gel-x");
  assert(
    repairedGelX?.addons.filter((addon) => addon.enabled).map((addon) => addon.addonId).join(",") === "addon-chrome,addon-crystals",
    "persistent demo repair preserves salon-owned service add-on selections",
  );
  const demoCopies = await listSalonInviteLocalCopies(VMB_DEMO_SALON_ID);
  assert(demoCopies.some(isSalonInviteMatchingActive), "persistent demo invite types are active");

  const loginNoBook = await resolveVmbMvpLogin({
    email: VMB_MVP_LOGIN_EMAIL,
    password: VMB_MVP_LOGIN_PASSWORD,
  });
  assert(loginNoBook.ok, "login without existing trial succeeds");
  if (!loginNoBook.ok) process.exit(1);
  assert(loginNoBook.trialId === VMB_DEMO_SALON_ID, "mvp login uses persistent demo salon");
  assert(loginNoBook.hasActiveBook, "mvp login repairs active demo book");
  assert(loginNoBook.redirectTo.startsWith("/vmb/today?analysis="), "mvp login redirects to Today");

  const bookTrial = await createVmbTrialLead({
    salonName: "Login Redirect Salon",
    ownerName: "Pat",
    email: `vmb-login-book-${Date.now()}@salon.test`,
    providerPlatform: "glossgenius",
  });
  if ("error" in bookTrial) process.exit(1);
  const bookTrialId = bookTrial.lead.id;
  await upsertWorkspaceForTrial({
    trialId: bookTrialId,
    salonName: bookTrial.lead.salonName,
    providerPlatform: "glossgenius",
  });
  const analyzed = await runVmbBookAnalysis({
    trialId: bookTrialId,
    salonName: bookTrial.lead.salonName,
    providerPlatform: "glossgenius",
    rawText: VMB_SAMPLE_BOOK_TEXT,
    sourceType: "sample",
  });
  assert(analyzed.ok, "seed active book for login redirect test");
  if (!analyzed.ok) process.exit(1);

  const loginWithBook = await resolveVmbMvpLogin({
    email: VMB_MVP_LOGIN_EMAIL,
    password: VMB_MVP_LOGIN_PASSWORD,
    existingTrialId: bookTrialId,
  });
  assert(loginWithBook.ok, "login with existing trial succeeds");
  if (!loginWithBook.ok) process.exit(1);
  assert(loginWithBook.hasActiveBook, "login detects active book");
  assert(loginWithBook.trialId === VMB_DEMO_SALON_ID, "mvp login keeps stable demo even with an old cookie");
  assert(loginWithBook.redirectTo.startsWith("/vmb/today?analysis="), "login with active book redirects to demo Today");

  console.log("OK: VMB demo + login entry paths");
}

void run();
