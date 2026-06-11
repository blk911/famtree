/**
 * npm run test:vmb:invite-drafts
 */
import { promises as fs } from "fs";
import { getActiveVmbAnalysis } from "../lib/vmb/active-analysis-resolver";
import { stableInviteDraftId } from "../lib/vmb/invites/draft-keys";
import { buildInviteDraftsForAnalysis } from "../lib/vmb/invites/build-invite-drafts-for-analysis";
import {
  ensureInviteDraftsForAnalysis,
  listInviteDraftsForTrial,
} from "../lib/vmb/invite-drafts/invite-draft-store";
import { buildVmbInviteSectionHref } from "../lib/vmb/salon-href";
import { loadVmbPageContext } from "../lib/vmb/load-vmb-page-context";
import { workspaceLatestAnalysisId } from "../lib/vmb/workspace-lifecycle";
import { getWorkspaceForTrial, setLatestAnalysis, upsertWorkspaceForTrial } from "../lib/vmb/workspace-store";
import { VMB_SAMPLE_BOOK_TEXT } from "../lib/vmb/sample-book";
import { runVmbBookAnalysis } from "../lib/vmb/run-book-analysis";
import { createVmbTrialLead } from "../lib/vmb/trial-store";
import { getVmbInviteDraftsFile } from "../lib/vmb/paths";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

async function cleanupDraftsForTrial(trialId: string): Promise<void> {
  try {
    const raw = await fs.readFile(getVmbInviteDraftsFile(), "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    const kept = parsed.filter(
      (d) =>
        typeof d === "object" &&
        d &&
        typeof (d as { trialId?: string }).trialId === "string" &&
        (d as { trialId: string }).trialId !== trialId,
    );
    await fs.writeFile(getVmbInviteDraftsFile(), JSON.stringify(kept, null, 2), "utf8");
  } catch {
    // no file
  }
}

async function run(): Promise<void> {
  const trialA = await createVmbTrialLead({
    salonName: "Invite Salon A",
    ownerName: "Owner A",
    email: `invite-a-${Date.now()}@salon.test`,
    providerPlatform: "glossgenius",
  });
  if ("error" in trialA) process.exit(1);
  const trialIdA = trialA.lead.id;

  await upsertWorkspaceForTrial({
    trialId: trialIdA,
    salonName: trialA.lead.salonName,
    ownerName: trialA.lead.ownerName,
    email: trialA.lead.email,
    providerPlatform: "glossgenius",
  });

  const analyzeA = await runVmbBookAnalysis({
    trialId: trialIdA,
    salonName: trialA.lead.salonName,
    providerPlatform: "glossgenius",
    rawText: VMB_SAMPLE_BOOK_TEXT,
    sourceType: "sample",
  });
  if (!analyzeA.ok) process.exit(1);
  const analysisIdA = analyzeA.data.analysis.analysisId;
  await setLatestAnalysis(trialIdA, analysisIdA);

  const ws = await getWorkspaceForTrial(trialIdA);
  assert(workspaceLatestAnalysisId(ws) === analysisIdA, "workspace latest for context");

  const active = await getActiveVmbAnalysis(trialIdA, {});
  assert(active.analysisId === analysisIdA, "getActiveVmbAnalysis resolves latest");

  const built = buildInviteDraftsForAnalysis(analyzeA.data.analysis, trialIdA);
  assert(built.length > 0, "builder creates drafts");
  const categories = new Set(built.map((d) => d.inviteCategory));
  assert(categories.has("private_client_network"), "network drafts");
  assert(categories.has("new_client_welcome"), "welcome drafts");
  assert(categories.has("revenue_touch"), "revenue drafts");

  const sample = built[0];
  const expectedId = stableInviteDraftId(
    trialIdA,
    analysisIdA,
    sample.clientName,
    sample.inviteCategory,
  );
  assert(sample.draftId === expectedId, "stable draft id");

  const first = await ensureInviteDraftsForAnalysis(trialIdA, analysisIdA);
  if ("error" in first) process.exit(1);
  const countFirst = first.drafts.length;

  const second = await ensureInviteDraftsForAnalysis(trialIdA, analysisIdA);
  if ("error" in second) process.exit(1);
  assert(second.drafts.length === countFirst, "refresh does not duplicate drafts");
  assert(
    second.drafts.every((d, i) => d.draftId === first.drafts[i]?.draftId),
    "stable ids preserved on refresh",
  );

  const trialB = await createVmbTrialLead({
    salonName: "Invite Salon B",
    ownerName: "Owner B",
    email: `invite-b-${Date.now()}@salon.test`,
  });
  if ("error" in trialB) process.exit(1);
  const listB = await listInviteDraftsForTrial(trialB.lead.id, analysisIdA);
  assert(listB.length === 0, "trial B cannot read trial A drafts");

  const homeLink = buildVmbInviteSectionHref(analysisIdA, "private_client_network");
  assert(homeLink.includes("analysis="), "dashboard invite link preserves analysis");
  assert(homeLink.includes("section=private_client_network"), "dashboard invite section param");

  assert(typeof loadVmbPageContext === "function", "page context loader exported");

  await cleanupDraftsForTrial(trialIdA);
  await cleanupDraftsForTrial(trialB.lead.id);
  console.log("OK: VMB invite draft tests passed");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
