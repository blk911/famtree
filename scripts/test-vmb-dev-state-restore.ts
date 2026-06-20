/**
 * npm run test:vmb:dev-state
 */
import {
  assertVmbDevStateAllowed,
  captureVmbDevState,
  clearVmbDevState,
  getVmbDevStateStatus,
  restoreVmbDevState,
} from "../lib/vmb/dev-state";
import { getActiveBookPointer, setActiveBookPointer } from "../lib/vmb/active-book-pointer";
import { saveVmbBookAnalysis } from "../lib/vmb/book-analysis/analysis-store";
import { setLatestAnalysis, upsertWorkspaceForTrial } from "../lib/vmb/workspace-store";
import type { VmbBookAnalysisResult } from "../types/vmb/book-analysis";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

async function seedExistingState(): Promise<{ salonId: string; analysisId: string }> {
  const salonId = "dev-state-test-salon";
  const analysisId = "analysis-dev-state-test";
  const analysis: VmbBookAnalysisResult = {
    analysisId,
    trialId: salonId,
    salonName: "Dev State Test Salon",
    providerPlatform: "glossgenius",
    recordCount: 3,
    reactivationTargets: [
      {
        id: "opp-reactivation",
        clientName: "Riley",
        opportunityType: "reactivation",
        summary: "Welcome-back candidate",
        estimatedValue: 120,
        confidence: "high",
        suggestedAction: "Send a welcome-back invite",
      },
    ],
    referralOpportunities: [],
    giftOpportunities: [],
    trustedProviderIntroOpportunities: [],
    estimatedRecoverableRevenue: 120,
    generatedAt: new Date("2026-06-20T12:00:00.000Z").toISOString(),
    parseSummary: {
      skippedRows: 0,
      warnings: [],
      detectedColumns: ["client", "service"],
      sourceType: "sample",
      fileName: "existing-dev-state.csv",
    },
  };

  const saved = await saveVmbBookAnalysis(analysis);
  assert(!("error" in saved), "seed analysis saved");

  const workspace = await upsertWorkspaceForTrial({
    trialId: salonId,
    salonName: "Dev State Test Salon",
    ownerName: "Dev Owner",
    email: "dev@example.com",
    providerPlatform: "glossgenius",
  });
  assert(!("error" in workspace), "seed workspace saved");

  const latest = await setLatestAnalysis(salonId, analysisId);
  assert(!("error" in latest), "seed latest analysis saved");

  const pointer = await setActiveBookPointer({
    salonId,
    analysisId,
    clientCount: analysis.recordCount,
    recordCount: analysis.recordCount,
    sourceFileName: analysis.parseSummary?.fileName,
  });
  assert(!("error" in pointer), "seed active-book pointer saved");

  return { salonId, analysisId };
}

async function run(): Promise<void> {
  await clearVmbDevState();
  const { salonId, analysisId } = await seedExistingState();

  const snapshot = await captureVmbDevState({
    salonId,
    latestAnalysisId: analysisId,
    sessionId: salonId,
    lastRoute: "/vmb/salon-page?dev=1",
    selected: { serviceId: "default-nails-gel-manicure", cardId: "birthday_card", inviteId: "invite-1" },
  });

  assert(snapshot.salonId === salonId, "capture writes salonId");
  assert(snapshot.latestAnalysisId === analysisId, "capture writes latestAnalysisId");
  assert(snapshot.activeBook?.analysisId === analysisId, "capture includes active book pointer");
  assert(snapshot.lastRoute === "/vmb/salon-page?dev=1", "capture writes lastRoute");
  assert(snapshot.counts.clients === 3, "capture includes client count");

  const status = await getVmbDevStateStatus();
  assert(status.exists, "status detects snapshot");
  assert(status.snapshot?.selected?.serviceId === "default-nails-gel-manicure", "status returns selected ids");

  const restored = await restoreVmbDevState();
  assert(restored.ok, "restore succeeds without ingest/reprocess");
  if (restored.ok) {
    assert(restored.redirectUrl === "/vmb/salon-page?dev=1", "restore returns lastRoute");
    assert(restored.analysisId === analysisId, "restore returns analysis id");
  }

  const pointer = await getActiveBookPointer(salonId);
  assert(pointer?.analysisId === analysisId, "restore rebinds active book pointer");

  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  const blocked = assertVmbDevStateAllowed();
  process.env.NODE_ENV = originalNodeEnv;
  assert(!blocked.ok, "production guard blocks dev-state endpoints");

  await clearVmbDevState();
  const cleared = await getVmbDevStateStatus();
  assert(!cleared.exists, "clear removes snapshot");

  console.log("OK: VMB dev state capture/restore/clear tests passed");
}

void run();
