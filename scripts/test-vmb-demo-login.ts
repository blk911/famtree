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

  const loginNoBook = await resolveVmbMvpLogin({
    email: VMB_MVP_LOGIN_EMAIL,
    password: VMB_MVP_LOGIN_PASSWORD,
  });
  assert(loginNoBook.ok, "login without existing trial succeeds");
  if (!loginNoBook.ok) process.exit(1);
  assert(loginNoBook.redirectTo === "/vmb/start", "login without active book redirects to start");
  assert(!loginNoBook.hasActiveBook, "fresh login has no active book");

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
  assert(
    loginWithBook.redirectTo === buildVmbTodayHref(analyzed.data.analysis.analysisId),
    "login with active book redirects to Today",
  );

  console.log("OK: VMB demo + login entry paths");
}

void run();
